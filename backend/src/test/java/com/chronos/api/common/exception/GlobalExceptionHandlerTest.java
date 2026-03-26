package com.chronos.api.common.exception;

import static org.assertj.core.api.Assertions.assertThat;

import com.chronos.api.common.logging.RequestLoggingConstants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.MDC;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(OutputCaptureExtension.class)
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void controlledExceptionsAreLoggedAtWarnWithRequestId(CapturedOutput output) {
        MDC.put(RequestLoggingConstants.REQUEST_ID_MDC_KEY, "req-warn-1");

        var response = handler.handleBadRequest(new BadRequestException("Bad input"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(output.getOut()).contains("WARN");
        assertThat(output.getOut()).contains("requestId=req-warn-1");
        assertThat(output.getOut()).contains("BadRequestException");
    }

    @Test
    void unexpectedExceptionsAreLoggedAtErrorWithRequestId(CapturedOutput output) {
        MDC.put(RequestLoggingConstants.REQUEST_ID_MDC_KEY, "req-error-1");

        var response = handler.handleUnknown(new RuntimeException("Boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(output.getOut()).contains("ERROR");
        assertThat(output.getOut()).contains("requestId=req-error-1");
        assertThat(output.getOut()).contains("RuntimeException");
        assertThat(output.getOut()).contains("Boom");
    }
}
