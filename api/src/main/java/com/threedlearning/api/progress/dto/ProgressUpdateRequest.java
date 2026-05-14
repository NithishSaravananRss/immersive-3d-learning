package com.threedlearning.api.progress.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ProgressUpdateRequest(
        boolean completed,
        @Min(0) @Max(100) int masteryScore
) {
}
