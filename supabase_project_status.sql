alter table "PROJECT"
add column if not exists "projStatus" text not null default 'Ongoing';

update "PROJECT"
set "projStatus" = 'Ongoing'
where "projStatus" is null or "projStatus" = '';

alter table "PROJECT"
add constraint "PROJECT_projStatus_check"
check ("projStatus" in ('Ongoing', 'Finished'));
