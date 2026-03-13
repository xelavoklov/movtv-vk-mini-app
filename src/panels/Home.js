import { useDeferredValue, useMemo, useState } from 'react';
import {
  Banner,
  Div,
  FormItem,
  Group,
  Header,
  Input,
  Panel,
  PanelHeader,
  Placeholder,
  Separator,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import PropTypes from 'prop-types';

import { getPostSenderLabel, getPostText } from '../utils/channel';
import { FeedPostCard } from './FeedPostCard';
import { useFeedVideoAutoplay } from './useFeedVideoAutoplay';

import './feed.css';

export const Home = ({ id, posts, isLoading, error, commentsAuth }) => {
  const routeNavigator = useRouteNavigator();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const { registerVideo } = useFeedVideoAutoplay();

  const filteredPosts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return posts;
    }

    return posts.filter((post) => {
      const haystack = [
        String(post.id ?? ''),
        getPostSenderLabel(post),
        getPostText(post),
        post.forwarded_from,
        post.forwarded_from_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [deferredQuery, posts]);

  const openPost = (postId) => {
    routeNavigator.push(`/post/${postId}`);
  };

  return (
    <Panel id={id}>
      <PanelHeader>movtv</PanelHeader>

      <Group>
        <Banner
          mode="image"
          header={`Постов: ${posts.length}`}
          subheader={
            error
              ? 'Загрузка завершилась с ошибкой'
              : isLoading
                ? 'Читаю архив канала'
                : `После фильтрации: ${filteredPosts.length}`
          }
        />
      </Group>

      <Group header={<Header size="s">Поиск</Header>}>
        <FormItem top="Фильтр по id, автору и тексту">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: 25, xelavoklovlive, переписка"
          />
        </FormItem>
      </Group>

      {isLoading ? (
        <Group>
          <Placeholder>Загружаю посты из channel.json</Placeholder>
        </Group>
      ) : null}

      {error ? (
        <Group>
          <Placeholder>
            Не удалось загрузить архив: {error}
          </Placeholder>
        </Group>
      ) : null}

      {!isLoading && !error && filteredPosts.length === 0 ? (
        <Group>
          <Placeholder>По этому запросу ничего не найдено.</Placeholder>
        </Group>
      ) : null}

      {!isLoading && !error && filteredPosts.length > 0 ? (
        <Group header={<Header size="s">Лента</Header>}>
          <div className="feed-list">
            {filteredPosts.map((post) => {
              return (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  commentsAuth={commentsAuth}
                  onOpenPost={openPost}
                  registerVideo={registerVideo}
                />
              );
            })}
          </div>
          <Separator />
          <Div className="feed-footer">Следующий этап: вынести данные на API или подключить пагинацию.</Div>
        </Group>
      ) : null}
    </Panel>
  );
};

Home.propTypes = {
  commentsAuth: PropTypes.shape({
    token: PropTypes.string.isRequired,
  }).isRequired,
  id: PropTypes.string.isRequired,
  posts: PropTypes.arrayOf(PropTypes.object).isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
};
