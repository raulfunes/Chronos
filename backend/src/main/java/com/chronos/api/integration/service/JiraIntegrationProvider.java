package com.chronos.api.integration.service;

import com.chronos.api.common.exception.BadRequestException;
import com.chronos.api.integration.model.IntegrationAccount;
import com.chronos.api.integration.model.IntegrationProvider;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class JiraIntegrationProvider implements IntegrationProviderHandler {

    @Override
    public IntegrationProvider provider() {
        return IntegrationProvider.JIRA;
    }

    @Override
    public String buildAuthorizationUrl(String state) {
        throw new BadRequestException("Jira integration is not configured yet");
    }

    @Override
    public ProviderConnectionResult completeAuthorization(String code) {
        throw new BadRequestException("Jira integration is not configured yet");
    }

    @Override
    public ProviderRefreshResult refreshAccessToken(IntegrationAccount integrationAccount, Map<String, Object> credentials) {
        throw new BadRequestException("Jira integration is not configured yet");
    }
}
