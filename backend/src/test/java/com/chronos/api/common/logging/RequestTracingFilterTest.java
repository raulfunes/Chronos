package com.chronos.api.common.logging;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestTracingFilterTest {

    private final RequestTracingFilter filter = new RequestTracingFilter();

    @Test
    void generatesRequestIdAddsResponseHeaderAndCleansMdc() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/goals");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> requestIdInsideChain = new AtomicReference<>();

        filter.doFilter(
            request,
            response,
            (req, res) -> {
                requestIdInsideChain.set(MDC.get(RequestLoggingConstants.REQUEST_ID_MDC_KEY));
                ((MockHttpServletResponse) res).setStatus(204);
            }
        );

        String responseRequestId = response.getHeader(RequestLoggingConstants.REQUEST_ID_HEADER);

        assertThat(responseRequestId).isNotBlank();
        assertThat(requestIdInsideChain.get()).isEqualTo(responseRequestId);
        assertThat(MDC.get(RequestLoggingConstants.REQUEST_ID_MDC_KEY)).isNull();
    }

    @Test
    void preservesIncomingRequestIdAndReturnsItInResponse() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/sessions");
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader(RequestLoggingConstants.REQUEST_ID_HEADER, "req-12345");
        AtomicReference<String> requestIdInsideChain = new AtomicReference<>();

        filter.doFilter(
            request,
            response,
            (req, res) -> requestIdInsideChain.set(MDC.get(RequestLoggingConstants.REQUEST_ID_MDC_KEY))
        );

        assertThat(requestIdInsideChain.get()).isEqualTo("req-12345");
        assertThat(response.getHeader(RequestLoggingConstants.REQUEST_ID_HEADER)).isEqualTo("req-12345");
        assertThat(MDC.get(RequestLoggingConstants.REQUEST_ID_MDC_KEY)).isNull();
    }
}
