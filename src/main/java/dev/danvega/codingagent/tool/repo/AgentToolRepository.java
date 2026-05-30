package dev.danvega.codingagent.tool.repo;

import dev.danvega.codingagent.applicationconfig.configuration.utils.SqlQueryLoader;
import dev.danvega.codingagent.tool.entity.AgentTool;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Types;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class AgentToolRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SqlQueryLoader sqlQueryLoader;

    public AgentToolRepository(JdbcTemplate jdbcTemplate, SqlQueryLoader sqlQueryLoader) {
        this.jdbcTemplate = jdbcTemplate;
        this.sqlQueryLoader = sqlQueryLoader;
    }

    public String create(AgentTool t, long now) {
        String sql = sqlQueryLoader.getQuery("TOOL.CREATE");
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[] { "id" });
            ps.setString(1, t.getName());
            ps.setString(2, t.getDescription());
            ps.setString(3, t.getMethod());
            ps.setString(4, t.getHost());
            ps.setString(5, t.getEndpoint());
            ps.setString(6, t.getRequestSchema());
            ps.setString(7, t.getSourceType());
            setNullableString(ps, 8, t.getAuthProfileId());
            ps.setString(9, t.getAuthType());
            ps.setString(10, t.getAuthConfig());
            ps.setBoolean(11, t.isEnabled());
            ps.setLong(12, now);
            ps.setLong(13, now);
            return ps;
        }, keyHolder);
        return String.valueOf(keyHolder.getKeys().get("id"));
    }

    public List<AgentTool> findAll() {
        return jdbcTemplate.query(sqlQueryLoader.getQuery("TOOL.FIND_ALL"), rowMapper());
    }

    public Optional<AgentTool> findById(String id) {
        return jdbcTemplate.query(sqlQueryLoader.getQuery("TOOL.FIND_BY_ID"), rowMapper(), id)
                .stream().findFirst();
    }

    public List<AgentTool> findByAssistant(String assistantId) {
        return jdbcTemplate.query(sqlQueryLoader.getQuery("TOOL.FIND_BY_ASSISTANT"), rowMapper(), assistantId);
    }

    public int update(AgentTool t, long now) {
        return jdbcTemplate.update(sqlQueryLoader.getQuery("TOOL.UPDATE"),
                t.getName(), t.getDescription(), t.getMethod(), t.getHost(), t.getEndpoint(),
                t.getRequestSchema(), t.getAuthProfileId(), t.getAuthType(), t.getAuthConfig(),
                t.isEnabled(), now, t.getId());
    }

    public int delete(String id) {
        return jdbcTemplate.update(sqlQueryLoader.getQuery("TOOL.DELETE"), id);
    }

    /** Current stored hash of the name+description used to build the embedding, or null. */
    public String findEmbeddingHash(String id) {
        return jdbcTemplate.query(sqlQueryLoader.getQuery("TOOL.FIND_EMBEDDING_HASH"),
                        rs -> rs.next() ? rs.getString(1) : null, id);
    }

    /** Stores the pgvector embedding literal (e.g. "[0.1,0.2,...]") plus its source hash. */
    public int updateEmbedding(String id, String vectorLiteral, String hash) {
        return jdbcTemplate.update(sqlQueryLoader.getQuery("TOOL.UPDATE_EMBEDDING"),
                vectorLiteral, hash, id);
    }

    /** Tools that have no embedding yet (id, name, description), for startup backfill. */
    public List<EmbeddingCandidate> findMissingEmbedding() {
        return jdbcTemplate.query(sqlQueryLoader.getQuery("TOOL.FIND_MISSING_EMBEDDING"),
                (rs, rowNum) -> new EmbeddingCandidate(
                        rs.getString("id"), rs.getString("name"), rs.getString("description")));
    }

    /**
     * Cosine similarity (1 - distance) of each of an assistant's enabled, embedded tools against
     * the supplied query vector, keyed by the raw {@code agent_tool.name}. Computed DB-side via
     * pgvector's {@code <=>} operator.
     */
    public Map<String, Double> similarityScores(String assistantId, String vectorLiteral) {
        Map<String, Double> scores = new java.util.HashMap<>();
        jdbcTemplate.query(sqlQueryLoader.getQuery("TOOL.SIMILARITY_BY_ASSISTANT"),
                rs -> { scores.put(rs.getString("name"), rs.getDouble("score")); },
                vectorLiteral, assistantId);
        return scores;
    }

    public record EmbeddingCandidate(String id, String name, String description) {}

    private static void setNullableString(PreparedStatement ps, int index, String value) throws java.sql.SQLException {
        if (value == null || value.isBlank()) {
            ps.setNull(index, Types.OTHER);
        } else {
            ps.setString(index, value);
        }
    }

    private RowMapper<AgentTool> rowMapper() {
        return (rs, rowNum) -> new AgentTool(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("method"),
                rs.getString("host"),
                rs.getString("endpoint"),
                rs.getString("request_schema"),
                rs.getString("source_type"),
                rs.getString("auth_profile_id"),
                rs.getString("auth_type"),
                rs.getString("auth_config"),
                rs.getBoolean("enabled"),
                rs.getLong("created_at"),
                rs.getLong("updated_at")
        );
    }
}
