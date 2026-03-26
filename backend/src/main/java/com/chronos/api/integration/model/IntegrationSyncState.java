package com.chronos.api.integration.model;

import com.chronos.api.common.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "integration_sync_states")
public class IntegrationSyncState extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "integration_account_id")
    private IntegrationAccount integrationAccount;

    @Column(nullable = false)
    private String resourceType;

    @Column(name = "sync_cursor", columnDefinition = "LONGTEXT")
    private String cursor;

    private Instant lastSuccessAt;

    private Instant lastAttemptAt;

    @Column(length = 2000)
    private String lastError;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String metadataJson = "{}";

    public IntegrationAccount getIntegrationAccount() {
        return integrationAccount;
    }

    public void setIntegrationAccount(IntegrationAccount integrationAccount) {
        this.integrationAccount = integrationAccount;
    }

    public String getResourceType() {
        return resourceType;
    }

    public void setResourceType(String resourceType) {
        this.resourceType = resourceType;
    }

    public String getCursor() {
        return cursor;
    }

    public void setCursor(String cursor) {
        this.cursor = cursor;
    }

    public Instant getLastSuccessAt() {
        return lastSuccessAt;
    }

    public void setLastSuccessAt(Instant lastSuccessAt) {
        this.lastSuccessAt = lastSuccessAt;
    }

    public Instant getLastAttemptAt() {
        return lastAttemptAt;
    }

    public void setLastAttemptAt(Instant lastAttemptAt) {
        this.lastAttemptAt = lastAttemptAt;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }
}
