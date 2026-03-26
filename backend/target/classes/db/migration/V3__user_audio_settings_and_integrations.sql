ALTER TABLE user_settings ADD ambient_sound VARCHAR(255) NOT NULL DEFAULT 'NONE';

ALTER TABLE user_settings ADD ambient_volume INT NOT NULL DEFAULT 35;

ALTER TABLE user_settings ADD audio_scope VARCHAR(255) NOT NULL DEFAULT 'FOCUS_ONLY';

CREATE TABLE integration_accounts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    user_id BIGINT NOT NULL,
    provider VARCHAR(255) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    status VARCHAR(255) NOT NULL,
    auth_type VARCHAR(255) NOT NULL,
    scopes_json LONGTEXT NOT NULL,
    credentials_json_encrypted LONGTEXT,
    config_json LONGTEXT NOT NULL,
    last_synced_at TIMESTAMP(6),
    token_expires_at TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_integration_accounts_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uk_integration_accounts_user_provider_account UNIQUE (user_id, provider, provider_account_id)
);

CREATE TABLE integration_links (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    user_id BIGINT NOT NULL,
    integration_account_id BIGINT NOT NULL,
    chronos_entity_type VARCHAR(255) NOT NULL,
    chronos_entity_id BIGINT NOT NULL,
    external_entity_type VARCHAR(255) NOT NULL,
    external_entity_id VARCHAR(255) NOT NULL,
    external_parent_id VARCHAR(255),
    link_type VARCHAR(255) NOT NULL,
    metadata_json LONGTEXT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_integration_links_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_integration_links_account FOREIGN KEY (integration_account_id) REFERENCES integration_accounts(id)
);

CREATE INDEX idx_integration_links_chronos_entity
    ON integration_links (user_id, chronos_entity_type, chronos_entity_id);

CREATE INDEX idx_integration_links_external_entity
    ON integration_links (integration_account_id, external_entity_type, external_entity_id);

CREATE TABLE integration_sync_states (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    integration_account_id BIGINT NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    sync_cursor LONGTEXT,
    last_success_at TIMESTAMP(6),
    last_attempt_at TIMESTAMP(6),
    last_error VARCHAR(2000),
    metadata_json LONGTEXT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_integration_sync_states_account FOREIGN KEY (integration_account_id) REFERENCES integration_accounts(id),
    CONSTRAINT uk_integration_sync_states_account_resource UNIQUE (integration_account_id, resource_type)
);
