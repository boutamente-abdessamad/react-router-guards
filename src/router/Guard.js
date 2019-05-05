import React, { useContext, useEffect, useMemo } from 'react';
import { Route, __RouterContext as RouterContext } from 'react-router-dom';
import { usePrevious, useStateWhenMounted } from 'hooks';
import { GUARD_TYPES, GuardContext, LoadingPageContext, ErrorPageContext } from './constants';

const Guard = ({ children, component, render }) => {
  const routeProps = useContext(RouterContext);
  const prevRouteProps = usePrevious(routeProps);
  const hasRouteUpdated = useMemo(
    () => JSON.stringify(prevRouteProps.match.params) !== JSON.stringify(routeProps.match.params),
    [routeProps, prevRouteProps],
  );

  const guards = useContext(GuardContext);
  const loadingPage = useContext(LoadingPageContext);
  const errorPage = useContext(ErrorPageContext);

  const initialRouteValidated = useMemo(() => guards.length === 0, [guards]);
  const [routeValidated, setRouteValidated] = useStateWhenMounted(initialRouteValidated);
  const [routeError, setRouteError] = useStateWhenMounted(null);
  const [pageProps, setPageProps] = useStateWhenMounted({});

  /**
   * Loops through all guards in context. If an error is thrown in any guards,
   * the loop will break and the not found page will be shown.
   */
  const guardRoute = async () => {
    try {
      let index = 0;
      let props = {};
      while (index < guards.length) {
        const { type, payload } = await guards[index](routeProps);
        if (type === GUARD_TYPES.ADD_PROPS) {
          props = Object.assign(props, payload || {});
        }
        index += 1;
      }
      setPageProps(props);
    } catch (error) {
      let { message } = error;
      try {
        message = JSON.parse(message);
      } catch (err) {
        // message not JSON parsable, continue
      }
      setRouteError(message || 'Not found.');
    }
    setRouteValidated(true);
  };

  useEffect(() => {
    guardRoute();
  }, []);

  useEffect(() => {
    if (hasRouteUpdated) {
      setRouteValidated(initialRouteValidated);
      if (!initialRouteValidated) {
        setRouteError(null);
        guardRoute();
      }
    }
  }, [initialRouteValidated, hasRouteUpdated]);

  if (!routeValidated) {
    return loadingPage(routeProps);
  } else if (routeError) {
    return errorPage({ ...routeProps, error: routeError });
  } else if (hasRouteUpdated) {
    return null;
  }
  return (
    <RouterContext.Provider value={{ ...routeProps, ...pageProps }}>
      <Route children={children} component={component} render={render} />
    </RouterContext.Provider>
  );
};

Guard.propTypes = {
  children: Route.propTypes.children,
  component: Route.propTypes.component,
  render: Route.propTypes.render,
};

export default Guard;
