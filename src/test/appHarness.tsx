import { App as AntdApp } from 'antd';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** The providers a rendered subtree needs to behave the way it does in the browser.
 *
 *  `AntdApp` is the one that used to go missing. Six suites hand-rolled their own
 *  `QueryClientProvider` wrapper and every copy left it out — and without it
 *  `App.useApp()` answers with an empty object, so `useActionErrorToast`'s
 *  `message.error?.()` is a silent no-op. That is why nine mutations' error toasts had
 *  no test: not because nobody wrote one, but because one could not have passed.
 *
 *  `retry: false` by default: a test asserting a failure should see it now rather than
 *  behind exponential backoff.
 */
interface AppWrapperOptions {
  retry?: boolean;
  /** Pass one in when the test needs to reach the cache — to seed it before mounting, or
   *  to read it afterwards. Ignored `retry` in that case: the client already has its own. */
  queryClient?: QueryClient;
}

export const appWrapper = ({ retry = false, queryClient: given }: AppWrapperOptions = {}) => {
  const queryClient = given ?? new QueryClient({ defaultOptions: { queries: { retry } } });
  return function AppHarness({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <AntdApp>{children}</AntdApp>
      </QueryClientProvider>
    );
  };
};
