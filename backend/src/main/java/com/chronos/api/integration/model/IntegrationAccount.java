package com.chronos.api.integration.model;

import com.chronos.api.common.model.BaseEntity;
import com.chronos.api.user.model.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "integration_accounts")
public class IntegrationAccount extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IntegrationProvider provider;

    @Column(nullable = false)
    private String providerAccountId;

    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IntegrationStatus status = IntegrationStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IntegrationAuthType authType = IntegrationAuthType.OAUTH2_AUTHORIZATION_CODE;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String scopesJson = "[]";

    @Column(columnDefinition = "LONGTEXT")
    private String credentialsJsonEncrypted;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String configJson = "{}";

    private Instant lastSyncedAt;

    private Instant tokenExpiresAt;

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public IntegrationProvider getProvider() {
        return provider;
    }

    public void setProvider(IntegrationProvider provider) {
        this.provider = provider;
    }

    public String getProviderAccountId() {
        return providerAccountId;
    }

    public void setProviderAccountId(String providerAccountId) {
        this.providerAccountId = providerAccountId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public IntegrationStatus getStatus() {
        return status;
    }

    public void setStatus(IntegrationStatus status) {
        this.status = status;
    }

    public IntegrationAuthType getAuthType() {
        return authType;
    }

    public void setAuthType(IntegrationAuthType authType) {
        this.authType = authType;
    }

    public String getScopesJson() {
        return scopesJson;
    }

    public void setScopesJson(String scopesJson) {
        this.scopesJson = scopesJson;
    }

    public String getCredentialsJsonEncrypted() {
        return credentialsJsonEncrypted;
    }

    public void setCredentialsJsonEncrypted(String credentialsJsonEncrypted) {
        this.credentialsJsonEncrypted = credentialsJsonEncrypted;
    }

    public String getConfigJson() {
        return configJson;
    }

    public void setConfigJson(String configJson) {
        this.configJson = configJson;
    }

    public Instant getLastSyncedAt() {
        return lastSyncedAt;
    }

    public void setLastSyncedAt(Instant lastSyncedAt) {
        this.lastSyncedAt = lastSyncedAt;
    }

    public Instant getTokenExpiresAt() {
        return tokenExpiresAt;
    }

    public void setTokenExpiresAt(Instant tokenExpiresAt) {
        this.tokenExpiresAt = tokenExpiresAt;
    }
}
