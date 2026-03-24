import { useEffect, useState } from 'react';
import { View, SplitLayout, SplitCol } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

import { Home, Post } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';
import { fetchChannelPosts } from './utils/channel';
import {
  authenticateCommentsUser,
  clearCommentsAuth,
  getBridgeLaunchParamsString,
  getBridgeUserProfile,
  getLaunchParamsString,
  loadStoredCommentsAuth,
  storeCommentsAuth,
} from './utils';

export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME } = useActiveVkuiLocation();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentsAuth, setCommentsAuth] = useState({
    token: '',
    user: null,
    isLoading: true,
    error: '',
    isAvailable: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      try {
        const nextPosts = await fetchChannelPosts();
        if (!isMounted) {
          return;
        }
        setPosts(nextPosts);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить канал');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCommentsAuth() {
      const launchParams = (await getBridgeLaunchParamsString()) || getLaunchParamsString();
      const userProfile = await getBridgeUserProfile();
      const storedAuth = loadStoredCommentsAuth();

      if (!launchParams) {
        setCommentsAuth({
          token: storedAuth?.access_token || '',
          user: storedAuth || null,
          isLoading: false,
          error: '',
          isAvailable: false,
        });
        return;
      }

      setCommentsAuth((currentState) => ({
        ...currentState,
        isLoading: true,
        error: '',
        isAvailable: true,
      }));

      try {
        const auth = await authenticateCommentsUser(launchParams, userProfile);
        if (!isMounted) {
          return;
        }

        storeCommentsAuth(auth);
        setCommentsAuth({
          token: auth.access_token,
          user: auth,
          isLoading: false,
          error: '',
          isAvailable: true,
        });
      } catch (authError) {
        if (!isMounted) {
          return;
        }

        clearCommentsAuth();
        setCommentsAuth({
          token: '',
          user: null,
          isLoading: false,
          error: authError instanceof Error ? authError.message : 'Не удалось авторизовать комментарии',
          isAvailable: true,
        });
      }
    }

    loadCommentsAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SplitLayout>
      <SplitCol>
        <View activePanel={activePanel}>
          <Home id="home" posts={posts} isLoading={isLoading} error={error} commentsAuth={commentsAuth} />
          <Post id="post" posts={posts} isLoading={isLoading} error={error} commentsAuth={commentsAuth} />
        </View>
      </SplitCol>
    </SplitLayout>
  );
};
