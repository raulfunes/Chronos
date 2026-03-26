package com.chronos.api.integration.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.chronos.api.auth.dto.RegisterRequest;
import com.chronos.api.auth.service.AuthService;
import com.chronos.api.common.exception.NotFoundException;
import com.chronos.api.integration.dto.IntegrationConfigPatchRequest;
import com.chronos.api.integration.dto.IntegrationLinkRequest;
import com.chronos.api.integration.model.IntegrationAccount;
import com.chronos.api.integration.model.IntegrationAuthType;
import com.chronos.api.integration.model.IntegrationLink;
import com.chronos.api.integration.model.IntegrationProvider;
import com.chronos.api.integration.model.IntegrationStatus;
import com.chronos.api.integration.model.IntegrationSyncState;
import com.chronos.api.integration.repository.IntegrationAccountRepository;
import com.chronos.api.integration.repository.IntegrationLinkRepository;
import com.chronos.api.integration.repository.IntegrationSyncStateRepository;
import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.model.UserRole;
import com.chronos.api.user.repository.AppUserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class IntegrationServiceTest {

    @Autowired
    private IntegrationService integrationService;

    @Autowired
    private IntegrationAccountRepository integrationAccountRepository;

    @Autowired
    private IntegrationLinkRepository integrationLinkRepository;

    @Autowired
    private IntegrationSyncStateRepository integrationSyncStateRepository;

    @Autowired
    private IntegrationCryptoService integrationCryptoService;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void cryptoRoundTripPreservesCredentialPayload() {
        String encrypted = integrationCryptoService.encrypt("{\"refreshToken\":\"secret-refresh\"}");

        assertThat(encrypted).isNotBlank();
        assertThat(integrationCryptoService.decrypt(encrypted)).isEqualTo("{\"refreshToken\":\"secret-refresh\"}");
    }

    @Test
    void listAndGetAreScopedToTheCurrentUser() {
        AppUser owner = createUser("owner-integrations@example.com");
        AppUser stranger = createUser("stranger-integrations@example.com");
        IntegrationAccount account = createAccount(owner, "spotify-owner");

        assertThat(integrationService.list(owner.getId(), UserRole.USER)).hasSize(1);
        assertThat(integrationService.list(stranger.getId(), UserRole.USER)).isEmpty();
        assertThatThrownBy(() -> integrationService.get(stranger.getId(), UserRole.USER, account.getId()))
            .isInstanceOf(NotFoundException.class)
            .hasMessage("Integration account not found");
    }

    @Test
    void updateConfigMergesNewValuesWithoutLosingExistingKeys() {
        AppUser user = createUser("config-merge@example.com");
        IntegrationAccount account = createAccount(user, "spotify-config");

        var response = integrationService.updateConfig(
            user.getId(),
            UserRole.USER,
            account.getId(),
            new IntegrationConfigPatchRequest(Map.of("selectedPlaylistUri", "spotify:playlist:123", "spotifyVolume", 55))
        );

        assertThat(response.config()).containsEntry("selectedPlaylistUri", "spotify:playlist:123");
        assertThat(response.config()).containsEntry("spotifyVolume", 55);
        assertThat(response.config()).containsEntry("selectedPlaylistName", "Initial focus");
    }

    @Test
    void createDeleteLinkAndDeleteAccountCleansOwnedData() {
        AppUser user = createUser("links@example.com");
        IntegrationAccount account = createAccount(user, "jira-workspace-1");
        createSyncState(account);

        var link = integrationService.createLink(
            user.getId(),
            UserRole.USER,
            account.getId(),
            new IntegrationLinkRequest(
                "TASK",
                42L,
                "ISSUE",
                "JRA-123",
                "CHRONOS",
                "PRIMARY",
                Map.of("site", "chronos.atlassian.net")
            )
        );

        assertThat(integrationService.listLinks(user.getId(), UserRole.USER, account.getId()))
            .singleElement()
            .extracting("externalEntityId")
            .isEqualTo("JRA-123");

        integrationService.deleteLink(user.getId(), UserRole.USER, account.getId(), link.id());
        assertThat(integrationService.listLinks(user.getId(), UserRole.USER, account.getId())).isEmpty();

        IntegrationLink persistedLink = new IntegrationLink();
        persistedLink.setUser(user);
        persistedLink.setIntegrationAccount(account);
        persistedLink.setChronosEntityType("TASK");
        persistedLink.setChronosEntityId(77L);
        persistedLink.setExternalEntityType("ISSUE");
        persistedLink.setExternalEntityId("JRA-456");
        persistedLink.setLinkType("PRIMARY");
        persistedLink.setMetadataJson(writeJson(Map.of("site", "chronos.atlassian.net")));
        integrationLinkRepository.save(persistedLink);

        integrationService.delete(user.getId(), UserRole.USER, account.getId());

        assertThat(integrationAccountRepository.findById(account.getId())).isEmpty();
        assertThat(integrationLinkRepository.findAllByIntegrationAccountIdAndUserIdOrderByCreatedAtDesc(account.getId(), user.getId())).isEmpty();
        assertThat(integrationSyncStateRepository.findByIntegrationAccountIdAndResourceType(account.getId(), "ISSUE")).isEmpty();
    }

    private AppUser createUser(String email) {
        Long userId = authService.register(new RegisterRequest("Integration Tester", email, "password123")).userId();
        return appUserRepository.findById(userId).orElseThrow();
    }

    private IntegrationAccount createAccount(AppUser user, String providerAccountId) {
        IntegrationAccount account = new IntegrationAccount();
        account.setUser(user);
        account.setProvider(IntegrationProvider.SPOTIFY);
        account.setProviderAccountId(providerAccountId);
        account.setDisplayName("Chronos Spotify");
        account.setStatus(IntegrationStatus.ACTIVE);
        account.setAuthType(IntegrationAuthType.OAUTH2_AUTHORIZATION_CODE);
        account.setScopesJson(writeJson(List.of("streaming", "playlist-read-private")));
        account.setConfigJson(writeJson(Map.of(
            "selectedPlaylistName", "Initial focus",
            "selectedPlaylistUri", "spotify:playlist:seed",
            "spotifyVolume", 70
        )));
        account.setCredentialsJsonEncrypted(integrationCryptoService.encrypt(writeJson(Map.of("refreshToken", "seed-token"))));
        account.setLastSyncedAt(Instant.now());
        account.setTokenExpiresAt(Instant.now().plusSeconds(3600));
        return integrationAccountRepository.save(account);
    }

    private void createSyncState(IntegrationAccount account) {
        IntegrationSyncState syncState = new IntegrationSyncState();
        syncState.setIntegrationAccount(account);
        syncState.setResourceType("ISSUE");
        syncState.setCursor("{\"next\":\"cursor-1\"}");
        syncState.setMetadataJson(writeJson(Map.of("lastProject", "CHRONOS")));
        integrationSyncStateRepository.save(syncState);
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
