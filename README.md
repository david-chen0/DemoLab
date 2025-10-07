# DemoLab


## personal notes:
launch venv using `.\venv\Scripts\Activate`

possible wanted_props values(might be more):
```
Player Position & Movement
"X" - X coordinate
"Y" - Y coordinate
"Z" - Z coordinate
"pitch" - View pitch angle
"yaw" - View yaw angle
"velocity_X" - X velocity component
"velocity_Y" - Y velocity component
"velocity_Z" - Z velocity component

Player State & Health
"hp" - Health points
"armor_value" - Armor value
"is_alive" - Whether player is alive
"is_bot" - Whether player is a bot
"is_connected" - Whether player is connected
"is_defusing" - Whether player is defusing
"is_in_bombsite" - Whether player is in bombsite
"is_in_buy_zone" - Whether player is in buy zone
"is_scoped" - Whether player is scoped
"is_walking" - Whether player is walking
"is_ducking" - Whether player is ducking

Player Identity & Team
"player_name" - Player name
"player_steamid" - Player Steam ID
"team_name" - Team name
"team_num" - Team number (2 = Terrorist, 3 = Counter-Terrorist)
"team_clan_name" - Team clan name

Economy & Equipment
"cash" - Current money
"equipment_value" - Total equipment value
"equipment_value_this_round" - Equipment value for current round
"cash_spent_this_round" - Money spent this round
"has_defuse_kit" - Whether player has defuse kit
"has_helmet" - Whether player has helmet

Weapons & Equipment
"active_weapon_name" - Currently active weapon
"active_weapon_ammo" - Ammo in active weapon
"active_weapon_reserve" - Reserve ammo for active weapon
"flash_duration" - Flash effect duration
"flash_max_alpha" - Maximum flash alpha value

Game State
"tick" - Current game tick
"seconds" - Time in seconds
"score" - Player score
"kills" - Number of kills
"deaths" - Number of deaths
"assists" - Number of assists
"mvps" - Number of MVP awards

Round & Match State
"round_start_money" - Money at round start
"is_freeze_period" - Whether in freeze period
"is_warmup_period" - Whether in warmup period
"game_phase" - Current game phase
```
