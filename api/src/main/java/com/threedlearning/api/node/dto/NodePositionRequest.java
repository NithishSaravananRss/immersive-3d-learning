package com.threedlearning.api.node.dto;

import jakarta.validation.constraints.NotNull;

public record NodePositionRequest(
        @NotNull Double x,
        @NotNull Double y,
        @NotNull Double z
) {
}
