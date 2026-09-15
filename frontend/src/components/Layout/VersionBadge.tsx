import { useGetVersionQuery } from '../../app/services/versionApi';

interface VersionBadgeProps {
  /** Whether the sidebar is in its collapsed (icon-only) mode. */
  collapsed: boolean;
}

/**
 * Small muted "v<version>" badge shown at the bottom of the sidebar, so
 * users can report which build they are on when filing issues.
 *
 * Fetches the version once via RTK Query (`/api/version`, cached per
 * session). Renders nothing while loading or on error — a missing badge
 * must never break the layout.
 *
 * @param props - `collapsed` mirrors the sidebar collapse state to adjust styling.
 * @returns The version badge element, or `null` when the version is unavailable.
 */
const VersionBadge = ({ collapsed }: VersionBadgeProps) => {
  const { data, isLoading, isError } = useGetVersionQuery();

  if (isLoading || isError || !data) {
    return null;
  }

  return (
    <div
      title={`v${data.version}`}
      className={`select-none px-3 py-1 text-xs text-muted-foreground ${collapsed ? 'text-center' : ''}`}
    >
      v{data.version}
    </div>
  );
};

export default VersionBadge;
