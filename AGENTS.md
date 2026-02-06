# Agents

This project defines the following custom agents for Codex.

| Name | Description | Source |
| --- | --- | --- |
| architect | Produces architecture + system design for new features in the Todo app. No code generation. | agents/arch.agent.md |
| planner | Creates actionable implementation plans grounded in PRPs, USER_GUIDE, and EVALUATION checklists. | agents/planner.agent.md |
| developer | Full-stack developer for this Todo app: plans tasks, implements features, writes tests, and performs code review. | agents/developer.agent.md |
| tester | Verifies feature completeness and regression safety using PRP and EVALUATION test requirements. | agents/tester.agent.md |
