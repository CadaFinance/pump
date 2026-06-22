-- Default admin todo list sort: priority (urgent → low). Switch to manual via drag/reorder.
INSERT INTO platform_settings (key, value)
VALUES ('admin_todos_sort_mode', 'priority')
ON CONFLICT (key) DO NOTHING;
