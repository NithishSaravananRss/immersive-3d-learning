package com.threedlearning.api.auth.dto;

import com.threedlearning.api.user.EducationType;
import com.threedlearning.api.user.Gender;
import com.threedlearning.api.user.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record GoogleAuthRequest(
        @NotBlank String idToken,
        @NotBlank @Size(max = 80) String name,
        @NotNull UserRole role,
        @NotNull EducationType educationType,
        Gender gender
) {
}
