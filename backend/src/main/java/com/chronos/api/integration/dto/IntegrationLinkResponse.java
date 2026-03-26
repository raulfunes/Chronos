package com.chronos.api.integration.dto;

import java.time.Instant;
import java.util.Map;

public record IntegrationLinkResponse(
    Long id,
    Long integrationAccountId,
    String chronosEntityType,
    Long chronosEntityId,
    String externalEntityType,
    String externalEntityId,
    String externalParentId,
    String linkType,
    Map<String, Object> metadata,
    Instant createdAt,
    Instant updatedAt
) {
}
