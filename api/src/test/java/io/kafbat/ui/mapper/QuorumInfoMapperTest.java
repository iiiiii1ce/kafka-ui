package io.kafbat.ui.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import io.kafbat.ui.model.InternalQuorumInfo;
import java.util.List;
import org.apache.kafka.clients.admin.QuorumInfo;
import org.apache.kafka.clients.admin.RaftVoterEndpoint;
import org.junit.jupiter.api.Test;

class QuorumInfoMapperTest {

  @Test
  void mapsNodeIdAndEndpoints() throws ReflectiveOperationException {
    var constructor = QuorumInfo.Node.class.getDeclaredConstructor(int.class, List.class);
    constructor.setAccessible(true);
    QuorumInfo.Node source = constructor.newInstance(
        1,
        List.of(new RaftVoterEndpoint("CONTROLLER", "localhost", 9093))
    );

    InternalQuorumInfo.Node result = new QuorumInfoMapperImpl().toNode(source);

    assertThat(result.nodeId()).isEqualTo(1);
    assertThat(result.endpoints()).containsExactly(
        new InternalQuorumInfo.RaftVoterEndpoint("CONTROLLER", "localhost", 9093)
    );
  }
}
