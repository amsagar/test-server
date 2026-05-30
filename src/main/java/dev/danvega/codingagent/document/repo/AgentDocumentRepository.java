package dev.danvega.codingagent.document.repo;

import dev.danvega.codingagent.applicationconfig.configuration.utils.SqlQueryLoader;
import dev.danvega.codingagent.document.entity.AgentDocument;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Optional;

@Repository
public class AgentDocumentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SqlQueryLoader sqlQueryLoader;

    public AgentDocumentRepository(JdbcTemplate jdbcTemplate, SqlQueryLoader sqlQueryLoader) {
        this.jdbcTemplate = jdbcTemplate;
        this.sqlQueryLoader = sqlQueryLoader;
    }

    public String create(AgentDocument d, long now) {
        String sql = sqlQueryLoader.getQuery("DOCUMENT.CREATE");
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[] { "id" });
            ps.setString(1, d.getAssistantId());
            ps.setString(2, d.getName());
            ps.setString(3, d.getBlobPrefix());
            ps.setInt(4, d.getChunkCount());
            ps.setBoolean(5, d.isEnabled());
            ps.setLong(6, now);
            ps.setLong(7, now);
            return ps;
        }, keyHolder);
        return String.valueOf(keyHolder.getKeys().get("id"));
    }

    public Optional<AgentDocument> findById(String id) {
        return jdbcTemplate.query(sqlQueryLoader.getQuery("DOCUMENT.FIND_BY_ID"), rowMapper(), id)
                .stream().findFirst();
    }

    public List<AgentDocument> findByAssistant(String assistantId) {
        return jdbcTemplate.query(sqlQueryLoader.getQuery("DOCUMENT.FIND_BY_ASSISTANT"), rowMapper(), assistantId);
    }

    /** Number of enabled documents for an assistant — used to decide whether to attach the RAG advisor. */
    public int countEnabledByAssistant(String assistantId) {
        Integer count = jdbcTemplate.queryForObject(
                sqlQueryLoader.getQuery("DOCUMENT.COUNT_BY_ASSISTANT"), Integer.class, assistantId);
        return count == null ? 0 : count;
    }

    public int update(AgentDocument d, long now) {
        return jdbcTemplate.update(sqlQueryLoader.getQuery("DOCUMENT.UPDATE"),
                d.getName(), d.isEnabled(), now, d.getId());
    }

    public int updateChunkCount(String id, int chunkCount, long now) {
        return jdbcTemplate.update(sqlQueryLoader.getQuery("DOCUMENT.UPDATE_CHUNK_COUNT"),
                chunkCount, now, id);
    }

    public int delete(String id) {
        return jdbcTemplate.update(sqlQueryLoader.getQuery("DOCUMENT.DELETE"), id);
    }

    private RowMapper<AgentDocument> rowMapper() {
        return (rs, rowNum) -> new AgentDocument(
                rs.getString("id"),
                rs.getString("assistant_id"),
                rs.getString("name"),
                rs.getString("blob_prefix"),
                rs.getInt("chunk_count"),
                rs.getBoolean("enabled"),
                rs.getLong("created_at"),
                rs.getLong("updated_at")
        );
    }
}
