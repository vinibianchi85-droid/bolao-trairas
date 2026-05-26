
-- Rode este SQL no Supabase: SQL Editor > New query > Run

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  whatsapp text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  game_no int unique not null,
  phase text not null,
  home_team text not null,
  away_team text not null,
  home_score int,
  away_score int,
  starts_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists guesses (
  user_id uuid references auth.users(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  guess_home int,
  guess_away int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, game_id)
);

alter table profiles enable row level security;
alter table games enable row level security;
alter table guesses enable row level security;

drop policy if exists "profiles_read" on profiles;
create policy "profiles_read" on profiles for select using (auth.uid() is not null);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

drop policy if exists "games_read" on games;
create policy "games_read" on games for select using (auth.uid() is not null);

drop policy if exists "games_admin_update" on games;
create policy "games_admin_update" on games for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);

drop policy if exists "guesses_read_all_after_login" on guesses;
create policy "guesses_read_all_after_login" on guesses for select using (auth.uid() is not null);

drop policy if exists "guesses_insert_own_before_lock" on guesses;
create policy "guesses_insert_own_before_lock" on guesses for insert with check (
  auth.uid() = user_id and now() <= '2026-06-10 23:59:59-03'::timestamptz
);

drop policy if exists "guesses_update_own_before_lock" on guesses;
create policy "guesses_update_own_before_lock" on guesses for update using (
  auth.uid() = user_id and now() <= '2026-06-10 23:59:59-03'::timestamptz
);

insert into games (game_no, phase, home_team, away_team)
values
(1, 'Fase de grupos', 'Time 1A', 'Time 1B'),
(2, 'Fase de grupos', 'Time 2A', 'Time 2B'),
(3, 'Fase de grupos', 'Time 3A', 'Time 3B'),
(4, 'Fase de grupos', 'Time 4A', 'Time 4B'),
(5, 'Fase de grupos', 'Time 5A', 'Time 5B'),
(6, 'Fase de grupos', 'Time 6A', 'Time 6B'),
(7, 'Fase de grupos', 'Time 7A', 'Time 7B'),
(8, 'Fase de grupos', 'Time 8A', 'Time 8B'),
(9, 'Fase de grupos', 'Time 9A', 'Time 9B'),
(10, 'Fase de grupos', 'Time 10A', 'Time 10B'),
(11, 'Fase de grupos', 'Time 11A', 'Time 11B'),
(12, 'Fase de grupos', 'Time 12A', 'Time 12B'),
(13, 'Fase de grupos', 'Time 13A', 'Time 13B'),
(14, 'Fase de grupos', 'Time 14A', 'Time 14B'),
(15, 'Fase de grupos', 'Time 15A', 'Time 15B'),
(16, 'Fase de grupos', 'Time 16A', 'Time 16B'),
(17, 'Fase de grupos', 'Time 17A', 'Time 17B'),
(18, 'Fase de grupos', 'Time 18A', 'Time 18B'),
(19, 'Fase de grupos', 'Time 19A', 'Time 19B'),
(20, 'Fase de grupos', 'Time 20A', 'Time 20B'),
(21, 'Fase de grupos', 'Time 21A', 'Time 21B'),
(22, 'Fase de grupos', 'Time 22A', 'Time 22B'),
(23, 'Fase de grupos', 'Time 23A', 'Time 23B'),
(24, 'Fase de grupos', 'Time 24A', 'Time 24B'),
(25, 'Fase de grupos', 'Time 25A', 'Time 25B'),
(26, 'Fase de grupos', 'Time 26A', 'Time 26B'),
(27, 'Fase de grupos', 'Time 27A', 'Time 27B'),
(28, 'Fase de grupos', 'Time 28A', 'Time 28B'),
(29, 'Fase de grupos', 'Time 29A', 'Time 29B'),
(30, 'Fase de grupos', 'Time 30A', 'Time 30B'),
(31, 'Fase de grupos', 'Time 31A', 'Time 31B'),
(32, 'Fase de grupos', 'Time 32A', 'Time 32B'),
(33, 'Fase de grupos', 'Time 33A', 'Time 33B'),
(34, 'Fase de grupos', 'Time 34A', 'Time 34B'),
(35, 'Fase de grupos', 'Time 35A', 'Time 35B'),
(36, 'Fase de grupos', 'Time 36A', 'Time 36B'),
(37, 'Fase de grupos', 'Time 37A', 'Time 37B'),
(38, 'Fase de grupos', 'Time 38A', 'Time 38B'),
(39, 'Fase de grupos', 'Time 39A', 'Time 39B'),
(40, 'Fase de grupos', 'Time 40A', 'Time 40B'),
(41, 'Fase de grupos', 'Time 41A', 'Time 41B'),
(42, 'Fase de grupos', 'Time 42A', 'Time 42B'),
(43, 'Fase de grupos', 'Time 43A', 'Time 43B'),
(44, 'Fase de grupos', 'Time 44A', 'Time 44B'),
(45, 'Fase de grupos', 'Time 45A', 'Time 45B'),
(46, 'Fase de grupos', 'Time 46A', 'Time 46B'),
(47, 'Fase de grupos', 'Time 47A', 'Time 47B'),
(48, 'Fase de grupos', 'Time 48A', 'Time 48B'),
(49, 'Fase de grupos', 'Time 49A', 'Time 49B'),
(50, 'Fase de grupos', 'Time 50A', 'Time 50B'),
(51, 'Fase de grupos', 'Time 51A', 'Time 51B'),
(52, 'Fase de grupos', 'Time 52A', 'Time 52B'),
(53, 'Fase de grupos', 'Time 53A', 'Time 53B'),
(54, 'Fase de grupos', 'Time 54A', 'Time 54B'),
(55, 'Fase de grupos', 'Time 55A', 'Time 55B'),
(56, 'Fase de grupos', 'Time 56A', 'Time 56B'),
(57, 'Fase de grupos', 'Time 57A', 'Time 57B'),
(58, 'Fase de grupos', 'Time 58A', 'Time 58B'),
(59, 'Fase de grupos', 'Time 59A', 'Time 59B'),
(60, 'Fase de grupos', 'Time 60A', 'Time 60B'),
(61, 'Fase de grupos', 'Time 61A', 'Time 61B'),
(62, 'Fase de grupos', 'Time 62A', 'Time 62B'),
(63, 'Fase de grupos', 'Time 63A', 'Time 63B'),
(64, 'Fase de grupos', 'Time 64A', 'Time 64B'),
(65, 'Fase de grupos', 'Time 65A', 'Time 65B'),
(66, 'Fase de grupos', 'Time 66A', 'Time 66B'),
(67, 'Fase de grupos', 'Time 67A', 'Time 67B'),
(68, 'Fase de grupos', 'Time 68A', 'Time 68B'),
(69, 'Fase de grupos', 'Time 69A', 'Time 69B'),
(70, 'Fase de grupos', 'Time 70A', 'Time 70B'),
(71, 'Fase de grupos', 'Time 71A', 'Time 71B'),
(72, 'Fase de grupos', 'Time 72A', 'Time 72B'),
(73, '32 avos', 'Time 73A', 'Time 73B'),
(74, '32 avos', 'Time 74A', 'Time 74B'),
(75, '32 avos', 'Time 75A', 'Time 75B'),
(76, '32 avos', 'Time 76A', 'Time 76B'),
(77, '32 avos', 'Time 77A', 'Time 77B'),
(78, '32 avos', 'Time 78A', 'Time 78B'),
(79, '32 avos', 'Time 79A', 'Time 79B'),
(80, '32 avos', 'Time 80A', 'Time 80B'),
(81, '32 avos', 'Time 81A', 'Time 81B'),
(82, '32 avos', 'Time 82A', 'Time 82B'),
(83, '32 avos', 'Time 83A', 'Time 83B'),
(84, '32 avos', 'Time 84A', 'Time 84B'),
(85, '32 avos', 'Time 85A', 'Time 85B'),
(86, '32 avos', 'Time 86A', 'Time 86B'),
(87, '32 avos', 'Time 87A', 'Time 87B'),
(88, '32 avos', 'Time 88A', 'Time 88B'),
(89, 'Oitavas', 'Time 89A', 'Time 89B'),
(90, 'Oitavas', 'Time 90A', 'Time 90B'),
(91, 'Oitavas', 'Time 91A', 'Time 91B'),
(92, 'Oitavas', 'Time 92A', 'Time 92B'),
(93, 'Oitavas', 'Time 93A', 'Time 93B'),
(94, 'Oitavas', 'Time 94A', 'Time 94B'),
(95, 'Oitavas', 'Time 95A', 'Time 95B'),
(96, 'Oitavas', 'Time 96A', 'Time 96B'),
(97, 'Quartas', 'Time 97A', 'Time 97B'),
(98, 'Quartas', 'Time 98A', 'Time 98B'),
(99, 'Quartas', 'Time 99A', 'Time 99B'),
(100, 'Quartas', 'Time 100A', 'Time 100B'),
(101, 'Semifinal', 'Time 101A', 'Time 101B'),
(102, 'Semifinal', 'Time 102A', 'Time 102B'),
(103, '3º lugar', 'Time 103A', 'Time 103B'),
(104, 'Final', 'Time 104A', 'Time 104B')
on conflict (game_no) do nothing;

-- Depois que teu usuário admin se cadastrar, rode trocando pelo e-mail:
-- update profiles set is_admin = true where id = (select id from auth.users where email = 'TEU_EMAIL_AQUI');
