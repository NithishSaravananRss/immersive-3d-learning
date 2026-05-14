package com.threedlearning.api.config;

import com.threedlearning.api.security.ClerkUserService;
import com.threedlearning.api.user.AppUser;
import java.security.Principal;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final List<String> allowedOrigins;
    private final ClerkUserService clerkUserService;
    private final JwtDecoder jwtDecoder;

    public WebSocketConfig(
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins,
            ClerkUserService clerkUserService,
            JwtDecoder jwtDecoder
    ) {
        this.allowedOrigins = allowedOrigins;
        this.clerkUserService = clerkUserService;
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.toArray(String[]::new))
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
                    return message;
                }

                String authHeader = resolveAuthorization(accessor);

                if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                    return message;
                }

                String token = authHeader.substring(7);
                Jwt jwt;

                try {
                    jwt = jwtDecoder.decode(token);
                } catch (JwtException exception) {
                    return message;
                }

                AppUser user = clerkUserService.getOrCreateUser(jwt);
                Principal principal = new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        user.getAuthorities()
                );
                accessor.setUser(principal);
                return message;
            }
        });
    }

    private String resolveAuthorization(StompHeaderAccessor accessor) {
        String nativeHeader = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);

        if (nativeHeader != null) {
            return nativeHeader;
        }

        return accessor.getFirstNativeHeader("authorization");
    }
}
