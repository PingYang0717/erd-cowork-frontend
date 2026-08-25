import type { ScenarioKey } from './scenario';
import type { Upload } from './upload';

/** The backend's Message verbatim (cowork master): its Mongo document shape leaks into
 *  the wire — steps and questions arrive as JSON strings — and the UI parses them at
 *  the point of use rather than through a translation layer. */
export interface Message {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  /** JSON of StepItem[]; null when the message carries no run. */
  stepsJson: string | null;
  artifactId: string | null;
  createdAt: string;
  artifactTitle: string | null;
  /** JSON of the backend's flat Question[]; null when nothing was asked. */
  questionsJson: string | null;
  /** 前端-only extension：mock 會回、真後端沒有。 */
  scenario?: ScenarioKey;
  /** 前端-only extension：訊息夾帶檔案的快照（mockup 的 bubble chips），後端尚未支援。 */
  attachments?: Upload[];
}
