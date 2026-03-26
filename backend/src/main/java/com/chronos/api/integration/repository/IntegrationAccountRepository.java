package com.chronos.api.integration.repository;

import com.chronos.api.integration.model.IntegrationAccount;
import com.chronos.api.integration.model.IntegrationProvider;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IntegrationAccountRepository extends JpaRepository<IntegrationAccount, Long> {

    List<IntegrationAccount> findAllByUserIdOrderByUpdatedAtDesc(Long userId);

    Optional<IntegrationAccount> findByIdAndUserId(Long id, Long userId);

    Optional<IntegrationAccount> findByUserIdAndProviderAndProviderAccountId(
        Long userId,
        IntegrationProvider provider,
        String providerAccountId
    );
}
