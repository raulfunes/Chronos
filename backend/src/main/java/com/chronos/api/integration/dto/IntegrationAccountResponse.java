package com.chronos.api.integration.dto;

import com.chronos.api.integration.model.IntegrationAuthType;
import com.chronos.api.integration.model.IntegrationProvider;
import com.chronos.api.integration.model.IntegrationStatus;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record IntegrationAccountResponse(
    Long id,
    IntegrationProvider provider,
    String providerAccountId,
    String displayName,
    IntegrationStatus status,
    IntegrationAuthType authType,
    List<String> scopes,
    Map<String, Object> config,
    Instant lastSyncedAt,
    Instant tokenExpiresAt,
    Instant createdAt,
    Instant updatedAt
) {
}
