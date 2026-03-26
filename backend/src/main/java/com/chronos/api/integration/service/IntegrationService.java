package com.chronos.api.integration.service;

import com.chronos.api.common.exception.BadRequestException;
import com.chronos.api.common.exception.NotFoundException;
import com.chronos.api.integration.config.IntegrationProperties;
import com.chronos.api.integration.dto.IntegrationAccountResponse;
import com.chronos.api.integration.dto.IntegrationConfigPatchRequest;
import com.chronos.api.integration.dto.IntegrationConnectStartResponse;
import com.chronos.api.integration.dto.IntegrationLinkRequest;
import com.chronos.api.integration.dto.IntegrationLinkResponse;
import com.chronos.api.integration.dto.IntegrationTokenRefreshResponse;
import com.chronos.api.integration.model.IntegrationAccount;
import com.chronos.api.integration.model.IntegrationProvider;
import com.chronos.api.integration.model.IntegrationStatus;
import com.chronos.api.integration.model.IntegrationLink;
import com.chronos.api.integration.repository.IntegrationAccountRepository;
import com.chronos.api.integration.repository.IntegrationLinkRepository;
import com.chronos.api.integration.repository.IntegrationSyncStateRepository;
import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.model.UserRole;
import com.chronos.api.user.repository.AppUserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class IntegrationService {

    private static final Logger log = LoggerFactory.getLogger(IntegrationService.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() { };

    private final IntegrationAccountRepository integrationAccountRepository;
    private final IntegrationLinkRepository integrationLinkRepository;
    private final IntegrationSyncStateRepository integrationSyncStateRepository;
    private final AppUserRepository appUserRepository;
    private final List<IntegrationProviderHandler> providerHandlers;
    private final IntegrationStateService integrationStateService;
    private final IntegrationCryptoService integrationCryptoService;
    private final IntegrationProperties integrationProperties;
    private final ObjectMapper objectMapper;

    public IntegrationService(
        IntegrationAccountRepository integrationAccountRepository,
        IntegrationLinkRepository integrationLinkRepository,
        IntegrationSyncStateRepository integrationSyncStateRepository,
        AppUserRepository appUserRepository,
        List<IntegrationProviderHandler> providerHandlers,
        IntegrationStateService integrationStateService,
        IntegrationCryptoService integrationCryptoService,
        IntegrationProperties integrationProperties,
        ObjectMapper objectMapper
    ) {
        this.integrationAccountRepository = integrationAccountRepository;
        this.integrationLinkRepository = integrationLinkRepository;
        this.integrationSyncStateRepository = integrationSyncStateRepository;
        this.appUserRepository = appUserRepository;
        this.providerHandlers = providerHandlers;
        this.integrationStateService = integrationStateService;
        this.integrationCryptoService = integrationCryptoService;
        this.integrationProperties = integrationProperties;
        this.objectMapper = objectMapper;
    }

    public List<IntegrationAccountResponse> list(Long userId, UserRole role) {
        if (role == UserRole.GUEST) {
            return List.of();
        }
        return integrationAccountRepository.findAllByUserIdOrderByUpdatedAtDesc(userId).stream().map(this::toResponse).toList();
    }

    public IntegrationAccountResponse get(Long userId, UserRole role, Long accountId) {
        if (role == UserRole.GUEST) {
            throw new BadRequestException("Guest users cannot access integrations");
        }
        return toResponse(getAccount(userId, accountId));
    }

    public IntegrationConnectStartResponse connectStart(Long userId, UserRole role, IntegrationProvider provider) {
        if (role == UserRole.GUEST) {
            throw new BadRequestException("Guest users cannot connect integrations");
        }
        String state = integrationStateService.issue(userId, provider);
        String redirectUrl = providerHandler(provider).buildAuthorizationUrl(state);
        return new IntegrationConnectStartResponse(provider, redirectUrl);
    }

    @Transactional
    public String completeAuthorization(IntegrationProvider provider, String state, String code, String error) {
        if (error != null && !error.isBlank()) {
            return buildFrontendRedirect(provider, "error", error);
        }
        if (state == null || state.isBlank() || code == null || code.isBlank()) {
            return buildFrontendRedirect(provider, "error", "Missing integration callback parameters");
        }

        IntegrationStateService.ParsedIntegrationState parsedState = integrationStateService.parse(state, provider);
        AppUser user = appUserRepository.findById(parsedState.userId())
            .orElseThrow(() -> new NotFoundException("User not found"));
        ProviderConnectionResult connectionResult = providerHandler(provider).completeAuthorization(code);

        IntegrationAccount integrationAccount = integrationAccountRepository
            .findByUserIdAndProviderAndProviderAccountId(user.getId(), provider, connectionResult.providerAccountId())
            .orElseGet(() -> {
                IntegrationAccount created = new IntegrationAccount();
                created.setUser(user);
                created.setProvider(provider);
                created.setProviderAccountId(connectionResult.providerAccountId());
                return created;
            });

        integrationAccount.setDisplayName(connectionResult.displayName());
        integrationAccount.setStatus(IntegrationStatus.ACTIVE);
        integrationAccount.setAuthType(connectionResult.authType());
        integrationAccount.setScopesJson(writeJson(connectionResult.scopes()));
        integrationAccount.setConfigJson(writeJson(connectionResult.config()));
        integrationAccount.setCredentialsJsonEncrypted(integrationCryptoService.encrypt(writeJson(connectionResult.credentials())));
        integrationAccount.setTokenExpiresAt(connectionResult.tokenExpiresAt());
        integrationAccount.setLastSyncedAt(Instant.now());
        integrationAccountRepository.save(integrationAccount);

        log.info(
            "Connected integration userId={} provider={} providerAccountId={}",
            user.getId(),
            provider,
            integrationAccount.getProviderAccountId()
        );
        return buildFrontendRedirect(provider, "connected", integrationAccount.getId().toString());
    }

    @Transactional
    public void delete(Long userId, UserRole role, Long accountId) {
        if (role == UserRole.GUEST) {
            throw new BadRequestException("Guest users cannot delete integrations");
        }
        IntegrationAccount account = getAccount(userId, accountId);
        integrationLinkRepository.deleteAllByIntegrationAccountId(accountId);
        integrationSyncStateRepository.deleteAllByIntegrationAccountId(accountId);
        integrationAccountRepository.delete(account);
        log.info("Deleted integration userId={} accountId={} provider={}", userId, accountId, account.getProvider());
    }

    @Transactional
    public IntegrationAccountResponse updateConfig(Long userId, UserRole role, Long accountId, IntegrationConfigPatchRequest request) {
        if (role == UserRole.GUEST) {
            throw new BadRequestException("Guest users cannot update integrations");
        }
        IntegrationAccount account = getAccount(userId, accountId);
        Map<String, Object> currentConfig = readMap(account.getConfigJson());
        Map<String, Object> patch = request.config() == null ? Map.of() : request.config();
        Map<String, Object> mergedConfig = new LinkedHashMap<>(currentConfig);
        patch.forEach((key, value) -> {
            if (value == null) {
                mergedConfig.remove(key);
                return;
            }
            mergedConfig.put(key, value);
        });
        account.setConfigJson(writeJson(mergedConfig));
        account.setLastSyncedAt(Instant.now());
        return toResponse(integrationAccountRepository.save(account));
    }

    public List<IntegrationLinkResponse> listLinks(Long userId, UserRole role, Long accountId) {
        if (role == UserRole.GUEST) {
            throw new BadRequestException("Guest users cannot access integration links");
        }
        getAccount(userId, accountId);
        return integrationLinkRepository.findAllByIntegrationAccountIdAndUserIdOrderByCreatedAtDesc(accountId, userId)
            .stream()
            .map(this::toLinkResponse)
            .toList();
    }

    @Transactional
    public IntegrationLinkResponse createLink(Long userId, UserRole role, Long accountId, IntegrationLinkRequest request) {
        if (role == UserRole.GUEST) {
            throw new BadRequestException("Guest users cannot create integration links");
        }
        IntegrationAccount account = getAccount(userId, accountId);
        IntegrationLink link = new IntegrationLink();
        link.setUser(account.getUser());
        link.setIntegrationAccount(account);
        link.setChronosEntityType(request.chronosEntityType().trim().toUpperCase());
        link.setChronosEntityId(request.chronosEntityId());
        link.setExternalEntityType(request.externalEntityType().trim().toUpperCase());
        link.setExternalEntityId(request.externalEntityId().trim());
        link.setExternalParentId(request.externalParentId());
        link.setLinkType(request.linkType().trim().toUpperCase());
        link.setMetadataJson(writeJson(request.metadata() == null ? Map.of() : request.metadata()));
        return toLinkResponse(integrationLinkRepository.save(link));
    }

    @Transactional
    public void deleteLink(Long userId, UserRole role, Long accountId, Long linkId) {
        if (role == UserRole.GUEST) {
            throw new BadRequestException("Guest users cannot delete integration links");
        }
        getAccount(userId, accountId);
        IntegrationLink link = integrationLinkRepository.findByIdAndIntegrationAccountIdAndUserId(linkId, accountId, userId)
            .orElseThrow(() -> new NotFoundException("Integration link not found"));
        integrationLinkRepository.delete(link);
    }

    @Transactional
    public IntegrationTokenRefreshResponse refreshToken(Long userId, UserRole role, Long accountId) {
        if (role == UserRole.GUEST) {
            throw new BadRequestException("Guest users cannot refresh integration tokens");
        }
        IntegrationAccount account = getAccount(userId, accountId);
        Map<String, Object> credentials = readMap(integrationCryptoService.decrypt(account.getCredentialsJsonEncrypted()));
        ProviderRefreshResult refreshResult = providerHandler(account.getProvider()).refreshAccessToken(account, credentials);
        account.setCredentialsJsonEncrypted(integrationCryptoService.encrypt(writeJson(refreshResult.credentials())));
        account.setTokenExpiresAt(refreshResult.expiresAt());
        account.setStatus(IntegrationStatus.ACTIVE);
        account.setLastSyncedAt(Instant.now());
        integrationAccountRepository.save(account);
        return new IntegrationTokenRefreshResponse(refreshResult.accessToken(), refreshResult.expiresAt());
    }

    private IntegrationAccount getAccount(Long userId, Long accountId) {
        return integrationAccountRepository.findByIdAndUserId(accountId, userId)
            .orElseThrow(() -> new NotFoundException("Integration account not found"));
    }

    private IntegrationProviderHandler providerHandler(IntegrationProvider provider) {
        return providerHandlers.stream()
            .filter(handler -> handler.provider() == provider)
            .findFirst()
            .orElseThrow(() -> new BadRequestException("Unsupported integration provider"));
    }

    private IntegrationAccountResponse toResponse(IntegrationAccount account) {
        return new IntegrationAccountResponse(
            account.getId(),
            account.getProvider(),
            account.getProviderAccountId(),
            account.getDisplayName(),
            account.getStatus(),
            account.getAuthType(),
            readStringList(account.getScopesJson()),
            readMap(account.getConfigJson()),
            account.getLastSyncedAt(),
            account.getTokenExpiresAt(),
            account.getCreatedAt(),
            account.getUpdatedAt()
        );
    }

    private IntegrationLinkResponse toLinkResponse(IntegrationLink link) {
        return new IntegrationLinkResponse(
            link.getId(),
            link.getIntegrationAccount().getId(),
            link.getChronosEntityType(),
            link.getChronosEntityId(),
            link.getExternalEntityType(),
            link.getExternalEntityId(),
            link.getExternalParentId(),
            link.getLinkType(),
            readMap(link.getMetadataJson()),
            link.getCreatedAt(),
            link.getUpdatedAt()
        );
    }

    private Map<String, Object> readMap(String rawJson) {
        return readJson(rawJson, MAP_TYPE, LinkedHashMap::new);
    }

    private List<String> readStringList(String rawJson) {
        return readJson(rawJson, STRING_LIST_TYPE, List::of);
    }

    private <T> T readJson(String rawJson, TypeReference<T> typeReference, Supplier<T> fallback) {
        if (rawJson == null || rawJson.isBlank()) {
            return fallback.get();
        }
        try {
            return objectMapper.readValue(rawJson, typeReference);
        } catch (Exception ex) {
            return fallback.get();
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception ex) {
            throw new BadRequestException("Failed to serialize integration payload");
        }
    }

    private String buildFrontendRedirect(IntegrationProvider provider, String status, String value) {
        return UriComponentsBuilder.fromUriString(integrationProperties.getFrontendBaseUrl())
            .path("/settings")
            .queryParam("integrationProvider", provider.name())
            .queryParam("integrationStatus", status)
            .queryParam("integrationValue", URLEncoder.encode(value, StandardCharsets.UTF_8))
            .build(true)
            .toUriString();
    }
}
