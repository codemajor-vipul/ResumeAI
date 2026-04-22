# ResumeAI.Shared

## Purpose
The shared class library referenced by every service. Contains DTOs (Data Transfer Objects), enums, and the generic `ApiResponse<T>` wrapper. This is the single source of truth for the "contract" between services and clients.

**YAGNI note:** Only things that are genuinely shared across 2+ services live here. Service-specific models stay in their own project.

## Contents

### `ApiResponse<T>`
Every endpoint returns this wrapper so the client always has a consistent shape:
```json
{ "success": true,  "data": { ... },  "error": null }
{ "success": false, "data": null,     "error": "Something went wrong" }
```

### Enums (`Enums/`)
| Enum | Values |
|---|---|
| `Role` | `USER`, `ADMIN` |
| `AuthProvider` | `LOCAL`, `GOOGLE`, `LINKEDIN` |
| `SubscriptionPlan` | `FREE`, `PREMIUM` |
| `ResumeStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `SectionType` | `SUMMARY`, `EXPERIENCE`, `EDUCATION`, `SKILLS`, `CERTIFICATIONS`, `PROJECTS`, `LANGUAGES`, `CUSTOM` |
| `AiRequestType` | `SUMMARY`, `BULLETS`, `ATS_CHECK`, `SKILLS`, `COVER_LETTER` |
| `AiRequestStatus` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `ExportFormat` | `PDF`, `DOCX` |
| `ExportStatus` | `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `NotificationType` | `ATS_COMPLETE`, `EXPORT_READY`, `AI_DONE`, `JOB_MATCH`, `PLAN_CHANGE`, `QUOTA_WARNING` |
| `NotificationChannel` | `IN_APP`, `EMAIL`, `PUSH` |

### DTOs (`DTOs/`)
All request/response shapes used across service boundaries. Defined as C# `record` types — immutable by default, structural equality, concise syntax.

#### Auth DTOs
- `RegisterRequest` · `LoginRequest` · `AuthResponse` · `UserDto`
- `UpdateProfileRequest` · `ChangePasswordRequest` · `UpdateSubscriptionRequest`

#### Resume DTOs
- `CreateResumeRequest` · `UpdateResumeRequest` · `ResumeDto`

#### Section DTOs
- `CreateSectionRequest` · `UpdateSectionRequest` · `SectionDto` · `ReorderSectionsRequest`

#### AI DTOs
- `GenerateSummaryRequest` · `GenerateBulletsRequest` · `CheckAtsRequest` · `SuggestSkillsRequest`
- `GenerateCoverLetterRequest` · `AiResponseDto` · `AiQuotaDto`

#### Export DTOs
- `ExportRequest` · `ExportJobDto`

#### Job Match DTOs
- `AnalyzeJobMatchRequest` · `JobMatchDto`

#### Notification DTOs
- `NotificationDto`

## Design Decisions
- **Records over classes for DTOs** — records are value-typed (structural equality), immutable, and have concise syntax. Perfect for DTOs that travel between layers.
- **No domain logic in Shared** — `Shared` is a pure data contract library. Validation attributes (`[Required]`, `[MaxLength]`) are acceptable; business logic is not.
- **Shared enums, not string literals** — using strongly-typed enums instead of magic strings eliminates an entire class of typo bugs across all services.
- **One `ApiResponse<T>`** — instead of each service defining its own response wrapper (which would diverge over time), there's one canonical wrapper here. This is a textbook DRY win.
- **`Shared` is .NET Standard / net8.0** — keeps it compatible regardless of which runtime a service targets.

## Adding to a New Service
```xml
<!-- In your .csproj -->
<ItemGroup>
  <ProjectReference Include="..\ResumeAI.Shared\ResumeAI.Shared.csproj" />
</ItemGroup>
```
