import {useSettings} from '@common/core/settings/use-settings';

export function useAllSocialLoginsDisabled(): boolean {
  const {social} = useSettings();
  return (
    !social?.google?.enable &&
    !social?.facebook?.enable &&
    !social?.twitter?.enable &&
    !social?.envato?.enable
  );
}
