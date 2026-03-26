CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE goals (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    status VARCHAR(255) NOT NULL,
    priority VARCHAR(255) NOT NULL,
    target_date DATE,
    PRIMARY KEY (id),
    CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE tasks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    user_id BIGINT NOT NULL,
    goal_id BIGINT,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    status VARCHAR(255) NOT NULL,
    estimated_sessions INT NOT NULL,
    due_date DATE,
    PRIMARY KEY (id),
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_tasks_goal FOREIGN KEY (goal_id) REFERENCES goals(id)
);

CREATE TABLE focus_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    user_id BIGINT NOT NULL,
    goal_id BIGINT,
    task_id BIGINT,
    type VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    duration_minutes INT NOT NULL,
    scheduled_for TIMESTAMP(6),
    started_at TIMESTAMP(6),
    completed_at TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_sessions_goal FOREIGN KEY (goal_id) REFERENCES goals(id),
    CONSTRAINT fk_sessions_task FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE user_settings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    user_id BIGINT NOT NULL,
    focus_minutes INT NOT NULL,
    short_break_minutes INT NOT NULL,
    long_break_minutes INT NOT NULL,
    desktop_notifications BIT NOT NULL,
    sound_enabled BIT NOT NULL,
    theme VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_user_settings_user UNIQUE (user_id),
    CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id)
);
