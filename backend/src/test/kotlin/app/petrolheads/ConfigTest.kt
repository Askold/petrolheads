package app.petrolheads

import kotlin.test.Test
import kotlin.test.assertEquals

class ConfigTest {
    private fun groups(env: Map<String, String>) = AppConfig.fromEnv(env + ("DEV_AUTH" to "true")).groupChatIds

    @Test
    fun `several groups, old single variable, and none`() {
        assertEquals(listOf(-1001L, -1002L), groups(mapOf("GROUP_CHAT_IDS" to "-1001, -1002")))
        assertEquals(listOf(-1001L), groups(mapOf("GROUP_CHAT_ID" to "-1001")))
        assertEquals(listOf(-1001L, -1002L), groups(mapOf("GROUP_CHAT_IDS" to "-1001", "GROUP_CHAT_ID" to "-1002,-1001")))
        assertEquals(emptyList(), groups(emptyMap()))
    }
}
