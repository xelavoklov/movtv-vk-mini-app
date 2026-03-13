import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Card, Div, FormItem, RichCell, SimpleCell, Textarea } from '@vkontakte/vkui';
import PropTypes from 'prop-types';

import { createComment, fetchComments } from '../utils';
import {
  formatPostDate,
  getPostAvatarUrl,
  getPostForwardInfo,
  getPostMedia,
  getPostSenderLabel,
  getPostText,
} from '../utils/channel';

function renderFeedMedia(mediaItem) {
  if (mediaItem.kind === 'image') {
    return <img key={mediaItem.url} className="feed-card__media feed-card__media--image" src={mediaItem.url} alt={mediaItem.name} loading="lazy" />;
  }

  if (mediaItem.kind === 'video') {
    return (
      <div key={mediaItem.url} className="feed-card__media-shell">
        <video
          className="feed-card__media feed-card__media--video"
          src={mediaItem.url}
          controls
          preload="metadata"
          playsInline
        />
      </div>
    );
  }

  if (mediaItem.kind === 'audio') {
    return (
      <div key={mediaItem.url} className="feed-card__file">
        <div className="feed-card__file-label">{mediaItem.label}</div>
        <audio src={mediaItem.url} controls preload="metadata" />
      </div>
    );
  }

  return (
    <a key={mediaItem.url} className="feed-card__file feed-card__file--link" href={mediaItem.url} target="_blank" rel="noreferrer">
      {mediaItem.label}: {mediaItem.name}
    </a>
  );
}

export const FeedPostCard = ({ post, commentsAuth, onOpenPost }) => {
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [commentsState, setCommentsState] = useState({
    items: [],
    total: 0,
    isLoading: false,
    isLoaded: false,
    error: '',
  });
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const senderLabel = getPostSenderLabel(post);
  const text = getPostText(post);
  const media = getPostMedia(post);
  const forwardInfo = getPostForwardInfo(post);
  const avatarUrl = getPostAvatarUrl(post);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) {
      return undefined;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '300px 0px',
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCommentsPreview() {
      if (!isVisible || commentsState.isLoaded) {
        return;
      }

      setCommentsState((currentState) => ({
        ...currentState,
        isLoading: true,
        error: '',
      }));

      try {
        const payload = await fetchComments(post.id, commentsAuth.token, { limit: 5 });
        if (!isMounted) {
          return;
        }

        setCommentsState({
          items: payload.items || [],
          total: payload.total || 0,
          isLoading: false,
          isLoaded: true,
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
          isLoaded: true,
          error: loadError instanceof Error ? loadError.message : 'Не удалось загрузить комментарии',
        });
      }
    }

    loadCommentsPreview();

    return () => {
      isMounted = false;
    };
  }, [commentsAuth.token, commentsState.isLoaded, isVisible, post.id]);

  const reloadComments = async () => {
    const payload = await fetchComments(post.id, commentsAuth.token, { limit: 5 });
    setCommentsState({
      items: payload.items || [],
      total: payload.total || 0,
      isLoading: false,
      isLoaded: true,
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
      await reloadComments();
    } catch (submitError) {
      setCommentsState((currentState) => ({
        ...currentState,
        error: submitError instanceof Error ? submitError.message : 'Не удалось отправить комментарий',
      }));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <Card ref={cardRef} mode="shadow" className="feed-card">
      <Div>
        {media.length ? <div className="feed-card__media-list">{media.map(renderFeedMedia)}</div> : null}

        <button type="button" className="feed-card__content-button" onClick={() => onOpenPost(post.id)}>
          <RichCell
            disabled
            before={
              avatarUrl ? (
                <Avatar size={40} src={avatarUrl} />
              ) : (
                <Avatar size={40}>{senderLabel[0]}</Avatar>
              )
            }
            caption={`ID ${post.id}`}
            subhead={formatPostDate(post.date)}
            after={media.length ? `${media.length} медиа` : null}
          >
            {senderLabel}
          </RichCell>

          {forwardInfo ? (
            <SimpleCell disabled subtitle={forwardInfo.dateLabel || 'Пересланное сообщение'}>
              Переслано от {forwardInfo.name}
            </SimpleCell>
          ) : null}

          <div className="feed-card__text">{text || 'Без текста'}</div>
        </button>

        <div className="feed-card__comments">
          <div className="feed-card__comments-title">Комментарии</div>

          {commentsAuth.token ? (
            <FormItem top="Новый комментарий">
              <Textarea
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder="Напишите комментарий к этому посту"
                maxLength={4000}
              />
              <Div className="feed-card__actions">
                <Button size="m" onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmittingComment}>
                  {isSubmittingComment ? 'Отправляю…' : 'Отправить'}
                </Button>
              </Div>
            </FormItem>
          ) : null}

          {commentsState.isLoading ? <div className="feed-card__comments-state">Загружаю последние 5 комментариев…</div> : null}
          {!commentsState.isLoading && commentsState.error ? <div className="feed-card__comments-state">{commentsState.error}</div> : null}
          {!commentsState.isLoading && !commentsState.error && commentsState.items.length === 0 ? (
            <div className="feed-card__comments-state">Пока комментариев нет.</div>
          ) : null}

          {!commentsState.isLoading && !commentsState.error && commentsState.items.length > 0 ? (
            <div className="feed-card__comments-list">
              {commentsState.items.map((comment) => {
                const commentAuthor = [comment.user.first_name, comment.user.last_name].filter(Boolean).join(' ');

                return (
                  <div key={comment.id} className="feed-card__comment">
                    <div className="feed-card__comment-header">
                      <div className="feed-card__comment-name">{commentAuthor || `VK ${comment.user.vk_user_id}`}</div>
                      <div className="feed-card__comment-meta">{formatPostDate(comment.created_at)}</div>
                    </div>
                    <div className="feed-card__comment-body">{comment.body}</div>
                  </div>
                );
              })}
              {commentsState.total > commentsState.items.length ? (
                <button type="button" className="feed-card__comments-more" onClick={() => onOpenPost(post.id)}>
                  Открыть все комментарии ({commentsState.total})
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Div>
    </Card>
  );
};

FeedPostCard.propTypes = {
  commentsAuth: PropTypes.shape({
    token: PropTypes.string.isRequired,
  }).isRequired,
  onOpenPost: PropTypes.func.isRequired,
  post: PropTypes.object.isRequired,
};