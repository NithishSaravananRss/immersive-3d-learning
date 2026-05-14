package com.threedlearning.api.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserSyncRequest(
        @NotBlank @Size(max = 120) String displayName,
        @Email @Size(max = 120) String email
) {
}
