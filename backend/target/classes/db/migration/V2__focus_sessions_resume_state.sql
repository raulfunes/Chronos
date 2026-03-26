ALTER TABLE focus_sessions ADD remaining_seconds INT NOT NULL DEFAULT 0;

ALTER TABLE focus_sessions ADD last_resumed_at TIMESTAMP(6) NULL;

UPDATE focus_sessions
SET
    remaining_seconds = CASE
        WHEN status = 'COMPLETED' THEN 0
        ELSE duration_minutes * 60
    END,
    last_resumed_at = CASE
        WHEN status = 'RUNNING' THEN started_at
        ELSE NULL
    END;
