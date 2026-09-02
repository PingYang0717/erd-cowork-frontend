import {
  CheckCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  LoadingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import React, { useState } from 'react';

import type { StepItem, StepStatus } from '@/types/api';

import styles from './StepList.module.css';

/** How a run's steps are drawn, both while it runs (`StepRow`, one per arriving step)
 *  and after it finishes (`StepsRecap`, the collapsed "Worked through N steps" card).
 *
 *  Its own file because these three are one unit with one job, used by MessageBubble at
 *  two different moments — not because of length. `StepStatusIcon` stays private: it is
 *  the shared innards of the other two, and nothing outside needs it.
 */
const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCESS: 'Done',
  ERROR: 'Failed',
};

interface StepStatusIconProps {
  status: StepStatus;
}

const StepStatusIcon: React.FC<StepStatusIconProps> = ({ status }) => {
  const label = STEP_STATUS_LABEL[status];

  if (status === 'SUCCESS') {
    return <CheckCircleFilled aria-label={label} className={styles.stepIconSuccess} />;
  }
  if (status === 'RUNNING') {
    return <LoadingOutlined aria-label={label} spin className={styles.stepIconRunning} />;
  }
  if (status === 'ERROR') {
    return <CloseCircleFilled aria-label={label} className={styles.stepIconError} />;
  }
  return <span aria-label={label} role="img" className={styles.stepIconPending} />;
};

interface StepRowProps {
  step: StepItem;
}

export const StepRow: React.FC<StepRowProps> = ({ step }) => {
  return (
    <div className={styles.workingStep}>
      <StepStatusIcon status={step.status} />
      <span className={styles.stepText}>
        <span className={styles.stepTitle}>{step.title}</span>
        {step.description !== null && (
          <span className={styles.stepDescription}>{step.description}</span>
        )}
      </span>
    </div>
  );
};

// After a run completes, its steps stay behind as the mockup's collapsed
// "Worked through N steps" card, expandable to each step's title and description.
interface StepsRecapProps {
  steps: StepItem[];
}

export const StepsRecap: React.FC<StepsRecapProps> = ({ steps }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // The mockup leads the row with the run's outcome. A recap is only ever rendered for
  // a finished run, so the only question left is whether any step failed.
  const hasFailure = steps.some((step) => step.status === 'ERROR');

  return (
    <div className={styles.stepsRecap}>
      <button
        type="button"
        className={styles.stepsRecapToggle}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {/* Decorative, like every other icon on this surface: the toggle's accessible
            name has to stay exactly its label, and each step's own status is announced
            by `StepStatusIcon` once expanded. */}
        {hasFailure ? (
          <CloseCircleFilled
            aria-hidden
            className={`${styles.stepsRecapStatus} ${styles.stepIconError}`}
          />
        ) : (
          <CheckCircleFilled
            aria-hidden
            className={`${styles.stepsRecapStatus} ${styles.stepIconSuccess}`}
          />
        )}
        Worked through {steps.length} steps
        {isExpanded ? (
          <UpOutlined aria-hidden className={styles.stepsRecapChevron} />
        ) : (
          <DownOutlined aria-hidden className={styles.stepsRecapChevron} />
        )}
      </button>
      {isExpanded && (
        <div className={styles.stepsRecapList}>
          {steps.map((step) => (
            <StepRow key={step.stepKey} step={step} />
          ))}
        </div>
      )}
    </div>
  );
};
