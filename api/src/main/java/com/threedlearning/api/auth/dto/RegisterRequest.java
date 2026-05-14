package com.threedlearning.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 50) String username,
        @Email @NotBlank @Size(max = 120) String email,
        @NotBlank @Size(min = 8, max = 120) String password,
        @NotBlank @Size(max = 80) String displayName
) {
}
