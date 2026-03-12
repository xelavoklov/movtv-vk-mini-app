import { useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Div,
  FormItem,
  Group,
  Header,
  IconButton,
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Placeholder,
  RichCell,
  SimpleCell,
  Textarea,
} from '@vkontakte/vkui';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { Icon16LikeOutline, Icon20LikeCircleFillRed } from '@vkontakte/icons';
import PropTypes from 'prop-types';

import {
  formatPostDate,
  getPostForwardInfo,
  getPostAvatarUrl,
  getPostMedia,
  getPostSenderLabel,
  getPostText,
} from '../utils/channel';
import { createComment, fetchComments, likeComment, unlikeComment } from '../utils';

import './feed.css';

const renderMedia = (mediaItem) => {
  if (mediaItem.kind === 'image') {
    return <img key={mediaItem.url} className="post-media__image" src={mediaItem.url} alt={mediaItem.name} loading="lazy" />;
  }

  if (mediaItem.kind === 'video') {
    return <video key={mediaItem.url} className="post-media__video" src={mediaItem.url} controls preload="metadata" />;
  }

  if (mediaItem.kind === 'audio') {
    return (
      <div key={mediaItem.url} className="post-media__file">
        <div className="post-media__label">{mediaItem.label}</div>
        <audio src={mediaItem.url} controls preload="metadata" />
      </div>
    );
  }

  return (
    <a key={mediaItem.url} className="post-media__file post-media__link" href={mediaItem.url} target="_blank" rel="noreferrer">
      {mediaItem.label}: {mediaItem.name}
    </a>
  );
};

export const Post = ({ id, posts, isLoading, error, commentsAuth }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams();
  const postId = params?.postId;
  const post = posts.find((item) => String(item.id) === String(postId));
  const [commentsState, setCommentsState] = useState({
    items: [],
    total: 0,
    isLoading: true,
    error: '',
  });
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentActionId, setCommentActionId] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadComments() {
      if (!postId) {
        setCommentsState({ items: [], total: 0, isLoading: false, error: '' });
        return;
      }

      setCommentsState((currentState) => ({
        ...currentState,
        isLoading: true,
        error: '',
      }));

      try {
        const payload = await fetchComments(postId, commentsAuth.token);
        if (!isMounted) {
          return;
        }

        setCommentsState({
          items: payload.items || [],
          total: payload.total || 0,
          isLoading: false,
          error: '',
        });
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setCommentsState({
          items: [],
          total: 0,
          isLoading: false,
          error: loadError instanceof Error ? loadError.message : 'Не удалось загрузить комментарии',
        });
      }
    }

    loadComments();

    return () => {
      isMounted = false;
    };
  }, [commentsAuth.token, postId]);

  if (isLoading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Пост</PanelHeader>
        <Placeholder>Загружаю пост</Placeholder>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Пост</PanelHeader>
        <Placeholder>Ошибка загрузки: {error}</Placeholder>
      </Panel>
    );
  }

  if (!post) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Пост</PanelHeader>
        <Placeholder action={<Button onClick={() => routeNavigator.replace('/')}>Вернуться к ленте</Button>}>
          Пост не найден.
        </Placeholder>
      </Panel>
    );
  }

  const senderLabel = getPostSenderLabel(post);
  const text = getPostText(post);
  const media = getPostMedia(post);
  const forwardInfo = getPostForwardInfo(post);
  const avatarUrl = getPostAvatarUrl(post);

  const refreshComments = async () => {
    const payload = await fetchComments(post.id, commentsAuth.token);
    setCommentsState({
      items: payload.items || [],
      total: payload.total || 0,
      isLoading: false,
      error: '',
    });
  };

  const handleSubmitComment = async () => {
    const body = newComment.trim();

    if (!body || !commentsAuth.token) {
      return;
    }

    try {
      setIsSubmittingComment(true);
      await createComment(post.id, body, commentsAuth.token);
      setNewComment('');
      await refreshComments();
    } catch (submitError) {
      setCommentsState((currentState) => ({
        ...currentState,
        error: submitError instanceof Error ? submitError.message : 'Не удалось отправить комментарий',
      }));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleLike = async (comment) => {
    if (!commentsAuth.token) {
      return;
    }

    try {
      setCommentActionId(String(comment.id));

      if (comment.is_liked_by_me) {
        await unlikeComment(comment.id, commentsAuth.token);
      } else {
        await likeComment(comment.id, commentsAuth.token);
      }

      await refreshComments();
    } catch (commentError) {
      setCommentsState((currentState) => ({
        ...currentState,
        error: commentError instanceof Error ? commentError.message : 'Не удалось обновить лайк',
      }));
    } finally {
      setCommentActionId('');
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Пост #{post.id}</PanelHeader>

      <Group>
        <Div className="post-hero">
          <div className="post-hero__eyebrow">Детальный просмотр</div>
          <div className="post-hero__title">{senderLabel}</div>
          <div className="post-hero__text">{formatPostDate(post.date)}</div>
        </Div>
      </Group>

      <Group header={<Header size="s">Автор</Header>}>
        <RichCell
          disabled
          before={avatarUrl ? <Avatar size={48} src={avatarUrl} /> : <Avatar size={48}>{senderLabel[0]}</Avatar>}
          caption={`ID поста ${post.id}`}
          subhead={post.from_id || post.sender_id || 'Источник не указан'}
        >
          {senderLabel}
        </RichCell>
        {forwardInfo ? (
          <SimpleCell disabled subtitle={forwardInfo.dateLabel || 'Переслано'}>
            Переслано от {forwardInfo.name}
          </SimpleCell>
        ) : null}
      </Group>

      <Group header={<Header size="s">Текст</Header>}>
        <Div className="post-text">{text || 'У поста нет текстового содержимого.'}</Div>
      </Group>

      {media.length ? (
        <Group header={<Header size="s">Медиа</Header>}>
          <Div className="post-media">{media.map(renderMedia)}</Div>
        </Group>
      ) : null}

      <Group header={<Header size="s">Комментарии</Header>}>
        {commentsAuth.user ? (
          <Div className="comments-auth">
            <Avatar size={32} src={commentsAuth.user.photo_100}>{commentsAuth.user.first_name?.[0]}</Avatar>
            <div>
              <div className="comments-auth__title">
                Комментарии от имени {commentsAuth.user.first_name} {commentsAuth.user.last_name || ''}
              </div>
              <div className="comments-auth__text">Авторизация через VK Mini App активна.</div>
            </div>
          </Div>
        ) : commentsAuth.isLoading ? (
          <Div className="comments-state">Проверяю авторизацию VK…</Div>
        ) : commentsAuth.isAvailable ? (
          <Placeholder>Не удалось авторизовать комментарии: {commentsAuth.error || 'неизвестная ошибка'}</Placeholder>
        ) : (
          <Placeholder>Читать комментарии можно везде, писать их можно только внутри VK Mini App.</Placeholder>
        )}

        {commentsAuth.token ? (
          <FormItem top="Новый комментарий">
            <Textarea
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Напишите комментарий к этому посту"
              maxLength={4000}
            />
            <Div className="comments-compose__actions">
              <Button
                size="m"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? 'Отправляю…' : 'Отправить'}
              </Button>
            </Div>
          </FormItem>
        ) : null}

        {commentsState.isLoading ? (
          <Div className="comments-state">Загружаю комментарии…</Div>
        ) : null}

        {!commentsState.isLoading && commentsState.error ? (
          <Placeholder>Ошибка комментариев: {commentsState.error}</Placeholder>
        ) : null}

        {!commentsState.isLoading && !commentsState.error && commentsState.items.length === 0 ? (
          <Placeholder>Пока комментариев нет.</Placeholder>
        ) : null}

        {!commentsState.isLoading && !commentsState.error && commentsState.items.length > 0 ? (
          <Div className="comments-list">
            {commentsState.items.map((comment) => {
              const commentAuthor = [comment.user.first_name, comment.user.last_name].filter(Boolean).join(' ');
              const isLikeActionPending = commentActionId === String(comment.id);

              return (
                <div key={comment.id} className="comment-card">
                  <div className="comment-card__header">
                    <div className="comment-card__author">
                      <Avatar size={32} src={comment.user.photo_100}>{comment.user.first_name?.[0]}</Avatar>
                      <div>
                        <div className="comment-card__name">{commentAuthor || `VK ${comment.user.vk_user_id}`}</div>
                        <div className="comment-card__meta">
                          {formatPostDate(comment.created_at)}
                          {comment.is_edited ? ' · изменено' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="comment-card__counters">
                      {comment.replies_count ? `${comment.replies_count} ответов` : ''}
                    </div>
                  </div>

                  <div className="comment-card__body">{comment.body}</div>

                  <div className="comment-card__actions">
                    <IconButton
                      aria-label="Лайк"
                      disabled={!commentsAuth.token || isLikeActionPending}
                      onClick={() => handleToggleLike(comment)}
                    >
                      {comment.is_liked_by_me ? <Icon20LikeCircleFillRed /> : <Icon16LikeOutline />}
                    </IconButton>
                    <span className="comment-card__likes">{comment.likes_count}</span>
                  </div>
                </div>
              );
            })}
          </Div>
        ) : null}
      </Group>
    </Panel>
  );
};

Post.propTypes = {
  commentsAuth: PropTypes.shape({
    token: PropTypes.string.isRequired,
    user: PropTypes.shape({
      first_name: PropTypes.string,
      last_name: PropTypes.string,
      photo_100: PropTypes.string,
    }),
    isLoading: PropTypes.bool.isRequired,
    error: PropTypes.string.isRequired,
    isAvailable: PropTypes.bool.isRequired,
  }).isRequired,
  id: PropTypes.string.isRequired,
  posts: PropTypes.arrayOf(PropTypes.object).isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
};