package com.chronos.api.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RequestTracingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestTracingFilter.class);
    private static final String HEALTH_PATH = "/actuator/health";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        String requestId = resolveRequestId(request.getHeader(RequestLoggingConstants.REQUEST_ID_HEADER));
        long startedAt = System.nanoTime();

        MDC.put(RequestLoggingConstants.REQUEST_ID_MDC_KEY, requestId);
        response.setHeader(RequestLoggingConstants.REQUEST_ID_HEADER, requestId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
            if (!HEALTH_PATH.equals(request.getRequestURI())) {
                log.info(
                    "Completed request method={} path={} status={} durationMs={} requestId={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    durationMs,
                    requestId
                );
            }
            MDC.remove(RequestLoggingConstants.REQUEST_ID_MDC_KEY);
        }
    }

    private String resolveRequestId(String requestIdHeader) {
        if (StringUtils.hasText(requestIdHeader)) {
            return requestIdHeader.trim();
        }
        return UUID.randomUUID().toString();
    }
}
