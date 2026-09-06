alter table "PROJECT"
add column if not exists "projStatus" text not null default 'Ongoing';

update "PROJECT"
set "projStatus" = 'Ongoing'
where "projStatus" is null or "projStatus" = '';

alter table "PROJECT"
add constraint "PROJECT_projStatus_check"
check ("projStatus" in ('Ongoing', 'Finished'));

-- Preserve student task totals after a member leaves or a group is deleted.
create table if not exists "TASKHISTORY" (
	"userId" uuid not null,
	"taskId" bigint not null,
	"statId" bigint not null,
	"assignedAt" timestamptz not null default now(),
	primary key ("userId", "taskId")
);

alter table "TASKHISTORY" enable row level security;

alter table "TASKHISTORY"
add column if not exists "projId" bigint,
add column if not exists "taskDueD" timestamptz,
add column if not exists "submittedAt" timestamptz;

alter table "USER"
add column if not exists "privateEmail" boolean not null default false,
add column if not exists "privateStats" boolean not null default false;

drop policy if exists "Users can read their task history" on "TASKHISTORY";
drop policy if exists "Group members can read task history" on "TASKHISTORY";
create policy "Group members can read task history"
on "TASKHISTORY"
for select
using (
	auth.uid() = "userId"
	or exists (
		select 1
		from "GROUPMEMBER" viewer
		join "GROUPMEMBER" target
			on target."grpId" = viewer."grpId"
		where viewer."userId" = auth.uid()
		  and target."userId" = "TASKHISTORY"."userId"
	)
);

drop policy if exists "Group members can read peer evaluations" on "PEEREVAL";
create policy "Group members can read peer evaluations"
on "PEEREVAL"
for select
using (
	exists (
		select 1
		from "GROUPMEMBER" viewer
		join "GROUPMEMBER" evaluated
			on evaluated."grpId" = viewer."grpId"
		where viewer."userId" = auth.uid()
		  and evaluated."grpmemId" = "PEEREVAL"."evaluatedGrpmemId"
	)
);

create or replace function sync_task_history_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into "TASKHISTORY" ("userId", "taskId", "statId", "assignedAt", "projId", "taskDueD")
	select gm."userId", new."taskId", t."statId", coalesce(new."assignedAt", now()), t."projId", t."taskDueD"
	from "GROUPMEMBER" gm
	join "TASK" t on t."taskId" = new."taskId"
	where gm."grpmemId" = new."grpmemId"
	on conflict ("userId", "taskId") do update
	set "statId" = excluded."statId", "projId" = excluded."projId", "taskDueD" = excluded."taskDueD";
	return new;
end;
$$;

drop trigger if exists taskassignment_history_trigger on "TASKASSIGNMENT";
create trigger taskassignment_history_trigger
after insert on "TASKASSIGNMENT"
for each row execute function sync_task_history_assignment();

create or replace function sync_task_history_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	update "TASKHISTORY"
	set "statId" = new."statId"
	where "taskId" = new."taskId";
	return new;
end;
$$;

drop trigger if exists task_history_status_trigger on "TASK";
create trigger task_history_status_trigger
after update of "statId" on "TASK"
for each row execute function sync_task_history_status();

insert into "TASKHISTORY" ("userId", "taskId", "statId", "assignedAt")
select gm."userId", ta."taskId", t."statId", coalesce(ta."assignedAt", now())
from "TASKASSIGNMENT" ta
join "GROUPMEMBER" gm on gm."grpmemId" = ta."grpmemId"
join "TASK" t on t."taskId" = ta."taskId"
on conflict ("userId", "taskId") do update
set "statId" = excluded."statId";

update "TASKHISTORY" h
set "projId" = t."projId", "taskDueD" = t."taskDueD"
from "TASK" t
where t."taskId" = h."taskId";

create or replace function sync_task_history_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	update "TASKHISTORY" h
	set "submittedAt" = new."submittedAt"
	from "GROUPMEMBER" gm
	where h."taskId" = new."taskId"
	  and gm."grpmemId" = new."grpmemId"
	  and h."userId" = gm."userId";
	return new;
end;
$$;

drop trigger if exists task_history_submission_trigger on "SUBMISSION";
create trigger task_history_submission_trigger
after insert or update of "submittedAt" on "SUBMISSION"
for each row execute function sync_task_history_submission();

update "TASKHISTORY" h
set "submittedAt" = s."submittedAt"
from "SUBMISSION" s
join "GROUPMEMBER" gm on gm."grpmemId" = s."grpmemId"
where s."taskId" = h."taskId"
  and h."userId" = gm."userId";
