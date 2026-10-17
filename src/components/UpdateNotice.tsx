import { useUpdate } from '../lib/version';
import { useClient } from '../net/client';
import { useMode } from '../state/view';
import { Icon } from './Icon';

/** Tells people when their page, or the Storyteller's, is behind the published version. */
export function UpdateNotice() {
  const mode = useMode();
  const available = useUpdate((s) => s.available);
  const hostOutdated = useClient((s) => s.hostOutdated && Boolean(s.pub));
  if (available) {
    return (
      <div className="update-notice surface" role="status">
        <Icon name="sparkle" />
        <span>
          A new version of the Grimoire is ready.
          {mode === 'st' && ' Your game is saved, so refreshing is safe.'}
        </span>
        <button className="btn small primary" onClick={() => location.reload()}>
          Refresh
        </button>
      </div>
    );
  }
  if (mode === 'player' && hostOutdated) {
    return (
      <div className="update-notice surface warn" role="status">
        <Icon name="info" />
        <span>The Storyteller’s page is an older version, so some things (like shared videos) won’t work. Ask them to refresh it.</span>
      </div>
    );
  }
  return null;
}
