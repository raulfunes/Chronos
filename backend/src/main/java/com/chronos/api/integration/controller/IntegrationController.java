package com.chronos.api.integration.controller;

import com.chronos.api.common.security.CurrentUser;
import com.chronos.api.integration.dto.IntegrationAccountResponse;
import com.chronos.api.integration.dto.IntegrationConfigPatchRequest;
import com.chronos.api.integration.dto.IntegrationConnectStartResponse;
import com.chronos.api.integration.dto.IntegrationLinkRequest;
import com.chronos.api.integration.dto.IntegrationLinkResponse;
import com.chronos.api.integration.dto.IntegrationTokenRefreshResponse;
import com.chronos.api.integration.model.IntegrationProvider;
import com.chronos.api.integration.service.IntegrationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

@RestController
@RequestMapping("/api/v1/integrations")
public class IntegrationController {

    private final IntegrationService integrationService;
    private final CurrentUser currentUser;

    public IntegrationController(IntegrationService integrationService, CurrentUser currentUser) {
        this.integrationService = integrationService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<IntegrationAccountResponse> list() {
        var user = currentUser.require();
        return integrationService.list(user.getUserId(), user.getRole());
    }

    @GetMapping("/{accountId}")
    public IntegrationAccountResponse get(@PathVariable Long accountId) {
        var user = currentUser.require();
        return integrationService.get(user.getUserId(), user.getRole(), accountId);
    }

    @PostMapping("/{provider}/connect/start")
    public IntegrationConnectStartResponse connectStart(@PathVariable IntegrationProvider provider) {
        var user = currentUser.require();
        return integrationService.connectStart(user.getUserId(), user.getRole(), provider);
    }

    @GetMapping("/{provider}/callback")
    @ResponseStatus(HttpStatus.FOUND)
    public RedirectView callback(
        @PathVariable IntegrationProvider provider,
        @RequestParam(required = false) String state,
        @RequestParam(required = false) String code,
        @RequestParam(required = false) String error
    ) {
        return new RedirectView(integrationService.completeAuthorization(provider, state, code, error));
    }

    @DeleteMapping("/{accountId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long accountId) {
        var user = currentUser.require();
        integrationService.delete(user.getUserId(), user.getRole(), accountId);
    }

    @PatchMapping("/{accountId}/config")
    public IntegrationAccountResponse updateConfig(
        @PathVariable Long accountId,
        @RequestBody IntegrationConfigPatchRequest request
    ) {
        var user = currentUser.require();
        return integrationService.updateConfig(user.getUserId(), user.getRole(), accountId, request);
    }

    @PostMapping("/{accountId}/refresh-token")
    public IntegrationTokenRefreshResponse refreshToken(@PathVariable Long accountId) {
        var user = currentUser.require();
        return integrationService.refreshToken(user.getUserId(), user.getRole(), accountId);
    }

    @GetMapping("/{accountId}/links")
    public List<IntegrationLinkResponse> listLinks(@PathVariable Long accountId) {
        var user = currentUser.require();
        return integrationService.listLinks(user.getUserId(), user.getRole(), accountId);
    }

    @PostMapping("/{accountId}/links")
    public IntegrationLinkResponse createLink(
        @PathVariable Long accountId,
        @Valid @RequestBody IntegrationLinkRequest request
    ) {
        var user = currentUser.require();
        return integrationService.createLink(user.getUserId(), user.getRole(), accountId, request);
    }

    @DeleteMapping("/{accountId}/links/{linkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLink(@PathVariable Long accountId, @PathVariable Long linkId) {
        var user = currentUser.require();
        integrationService.deleteLink(user.getUserId(), user.getRole(), accountId, linkId);
    }
}
