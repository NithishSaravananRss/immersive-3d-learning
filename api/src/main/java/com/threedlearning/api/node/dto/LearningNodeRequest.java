package com.threedlearning.api.node.dto;

import com.threedlearning.api.node.NodeCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record LearningNodeRequest(
        @NotBlank @Size(max = 80) String slug,
        @NotNull NodeCategory category,
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 400) String summary,
        @NotBlank @Size(max = 400) String prompt,
        @NotBlank @Size(max = 20) String color,
        boolean published,
        @Valid @NotNull NodePositionRequest position,
        @NotEmpty List<@NotBlank @Size(max = 500) String> details
) {
}
