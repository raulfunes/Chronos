package com.chronos.api.calendar.controller;

import com.chronos.api.calendar.dto.CalendarEntryResponse;
import com.chronos.api.calendar.service.CalendarService;
import com.chronos.api.common.security.CurrentUser;
import java.time.Instant;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/calendar")
public class CalendarController {

    private final CalendarService calendarService;
    private final CurrentUser currentUser;

    public CalendarController(CalendarService calendarService, CurrentUser currentUser) {
        this.calendarService = calendarService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<CalendarEntryResponse> entries(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return calendarService.getEntries(currentUser.require().getUserId(), from, to);
    }
}
