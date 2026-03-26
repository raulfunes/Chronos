package com.chronos.api.integration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record IntegrationLinkRequest(
    @NotBlank String chronosEntityType,
    @NotNull Long chronosEntityId,
    @NotBlank String externalEntityType,
    @NotBlank String externalEntityId,
    String externalParentId,
    @NotBlank String linkType,
    Map<String, Object> metadata
) {
}
