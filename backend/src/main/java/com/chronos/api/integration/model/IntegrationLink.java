package com.chronos.api.integration.model;

import com.chronos.api.common.model.BaseEntity;
import com.chronos.api.user.model.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "integration_links")
public class IntegrationLink extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "integration_account_id")
    private IntegrationAccount integrationAccount;

    @Column(nullable = false)
    private String chronosEntityType;

    @Column(nullable = false)
    private Long chronosEntityId;

    @Column(nullable = false)
    private String externalEntityType;

    @Column(nullable = false)
    private String externalEntityId;

    private String externalParentId;

    @Column(nullable = false)
    private String linkType;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String metadataJson = "{}";

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public IntegrationAccount getIntegrationAccount() {
        return integrationAccount;
    }

    public void setIntegrationAccount(IntegrationAccount integrationAccount) {
        this.integrationAccount = integrationAccount;
    }

    public String getChronosEntityType() {
        return chronosEntityType;
    }

    public void setChronosEntityType(String chronosEntityType) {
        this.chronosEntityType = chronosEntityType;
    }

    public Long getChronosEntityId() {
        return chronosEntityId;
    }

    public void setChronosEntityId(Long chronosEntityId) {
        this.chronosEntityId = chronosEntityId;
    }

    public String getExternalEntityType() {
        return externalEntityType;
    }

    public void setExternalEntityType(String externalEntityType) {
        this.externalEntityType = externalEntityType;
    }

    public String getExternalEntityId() {
        return externalEntityId;
    }

    public void setExternalEntityId(String externalEntityId) {
        this.externalEntityId = externalEntityId;
    }

    public String getExternalParentId() {
        return externalParentId;
    }

    public void setExternalParentId(String externalParentId) {
        this.externalParentId = externalParentId;
    }

    public String getLinkType() {
        return linkType;
    }

    public void setLinkType(String linkType) {
        this.linkType = linkType;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }
}
