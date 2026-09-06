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

drop policy if exists "Users can read their task history" on "TASKHISTORY";
create policy "Users can read their task history"
on "TASKHISTORY"
for select
using (auth.uid() = "userId");

create or replace function sync_task_history_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into "TASKHISTORY" ("userId", "taskId", "statId", "assignedAt")
	select gm."userId", new."taskId", t."statId", coalesce(new."assignedAt", now())
	from "GROUPMEMBER" gm
	join "TASK" t on t."taskId" = new."taskId"
	where gm."grpmemId" = new."grpmemId"
	on conflict ("userId", "taskId") do update
	set "statId" = excluded."statId";
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
