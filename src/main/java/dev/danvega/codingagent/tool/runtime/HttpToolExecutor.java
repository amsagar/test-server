package dev.danvega.codingagent.tool.runtime;

import tools.jackson.databind.ObjectMapper;
import dev.danvega.codingagent.tool.auth.service.HttpToolAuthService;
import dev.danvega.codingagent.tool.entity.AgentTool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Executes an {@link AgentTool} as an outbound HTTP request. Path placeholders
 * ({@code {name}}) in the endpoint are filled from the JSON input; remaining
 * fields become query params (GET/DELETE) or a JSON body (POST/PUT/PATCH).
 * Auth (inline or via a reusable profile) is resolved by {@link HttpToolAuthService}.
 */
@Component
@Slf4j
public class HttpToolExecutor {

    private static final Pattern PATH_PARAM = Pattern.compile("\\{([^}/]+)}");

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper;
    private final HttpToolAuthService authService;

    public HttpToolExecutor(ObjectMapper objectMapper, HttpToolAuthService authService) {
        this.objectMapper = objectMapper;
        this.authService = authService;
    }

    public String execute(AgentTool tool, String jsonInput) {
        Map<String, Object> input = parseInput(jsonInput);
        Map<String, Object> remaining = new LinkedHashMap<>(input);

        String endpoint = substitutePathParams(tool.getEndpoint(), remaining);
        String baseUrl = trimTrailingSlash(tool.getHost()) + ensureLeadingSlash(endpoint);
        HttpMethod method = HttpMethod.valueOf(
                (tool.getMethod() == null ? "GET" : tool.getMethod()).trim().toUpperCase());

        HttpToolAuthService.ResolvedAuth auth = authService.resolve(tool);
        Map<String, String> authHeaders = auth.headers();
        Map<String, String> authQuery = auth.queryParams();

        boolean hasBody = method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH;

        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(baseUrl);
        authQuery.forEach(uri::queryParam);
        if (!hasBody) {
            remaining.forEach((k, v) -> uri.queryParam(k, String.valueOf(v)));
        }

        RestClient.RequestBodySpec spec = restClient.method(method)
                .uri(uri.build(true).toUri())
                .headers(h -> authHeaders.forEach(h::set));

        try {
            String response;
            if (hasBody && !remaining.isEmpty()) {
                spec.header(HttpHeaders.CONTENT_TYPE, "application/json");
                response = spec.body(objectMapper.writeValueAsString(remaining))
                        .retrieve().body(String.class);
            } else {
                response = spec.retrieve().body(String.class);
            }
            return response == null ? "" : response;
        } catch (Exception e) {
            log.warn("HTTP tool '{}' call failed: {}", tool.getName(), e.getMessage());
            throw new RuntimeException("HTTP request failed: " + e.getMessage(), e);
        }
    }

    private String substitutePathParams(String endpoint, Map<String, Object> remaining) {
        if (endpoint == null) {
            return "";
        }
        Matcher matcher = PATH_PARAM.matcher(endpoint);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1);
            Object value = remaining.remove(key);
            String replacement = value == null ? "" : String.valueOf(value);
            matcher.appendReplacement(out, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private Map<String, Object> parseInput(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.readValue(json, Map.class);
            return map == null ? new LinkedHashMap<>() : new LinkedHashMap<>(map);
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private static String trimTrailingSlash(String s) {
        if (s == null) {
            return "";
        }
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private static String ensureLeadingSlash(String s) {
        if (s == null || s.isEmpty()) {
            return "";
        }
        return s.startsWith("/") ? s : "/" + s;
    }
}
