package com.chronos.api.integration.dto;

import java.util.Map;

public record IntegrationConfigPatchRequest(Map<String, Object> config) {
}
