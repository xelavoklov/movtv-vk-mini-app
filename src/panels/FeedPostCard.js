import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Card, Div, FormItem, IconButton, RichCell, SimpleCell, Textarea } from '@vkontakte/vkui';
import { Icon16LikeOutline, Icon16View, Icon20LikeCircleFillRed } from '@vkontakte/icons';
import PropTypes from 'prop-types';

import { createComment, fetchComments, likeComment, unlikeComment } from '../utils';
import {
  formatPostDate,
  getPostAvatarUrl,
  getPostForwardInfo,
  getPostMedia,
  getPostSenderLabel,
  getPostText,
} from '../utils/channel';
import { usePostViewTracker } from '../hooks/usePostViewTracker';

function renderFeedMedia(mediaItem, registerVideo, mediaId) {
  if (mediaItem.kind === 'image') {
    return <img key={mediaItem.url} className="feed-card__media feed-card__media--image" src={mediaItem.url} alt={mediaItem.name} loading="lazy" />;
  }

  if (mediaItem.kind === 'video') {
    return (
      <div key={mediaItem.url} className="feed-card__media-shell">
        <video
          ref={registerVideo ? registerVideo(mediaId) : undefined}
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

export const FeedPostCard = ({ post, commentsAuth, onOpenPost, registerVideo }) => {
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const viewStats = usePostViewTracker(cardRef, post.id, commentsAuth.token);
  const [commentsLimit, setCommentsLimit] = useState(5);
  const [commentsState, setCommentsState] = useState({
    items: [],
    total: 0,
    isLoading: false,
    error: '',
  });
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentActionId, setCommentActionId] = useState('');

  const senderLabel = getPostSenderLabel(post);
  const text = getPostText(post);
  const media = getPostMedia(post);
  const forwardInfo = getPostForwardInfo(post);
  const avatarUrl = getPostAvatarUrl(post);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) {
      setIsVisible(true);
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
      if (!isVisible) {
        return;
      }

      setCommentsState((currentState) => ({
        ...currentState,
        isLoading: true,
        error: '',
      }));

      try {
        const payload = await fetchComments(post.id, commentsAuth.token, { limit: commentsLimit });
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

    loadCommentsPreview();

    return () => {
      isMounted = false;
    };
  }, [commentsAuth.token, commentsLimit, isVisible, post.id]);

  const reloadComments = async () => {
    const payload = await fetchComments(post.id, commentsAuth.token, { limit: commentsLimit });
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

      await reloadComments();
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
    <div ref={cardRef}>
      <Card mode="shadow" className="feed-card">
        <Div>
        {media.length ? (
          <div className="feed-card__media-list">
            {media.map((mediaItem, index) => renderFeedMedia(mediaItem, registerVideo, `${post.id}:${index}`))}
          </div>
        ) : null}

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
          >
            {senderLabel}
          </RichCell>

          {forwardInfo ? (
            <SimpleCell disabled subtitle={forwardInfo.dateLabel || 'Пересланное сообщение'}>
              Переслано от {forwardInfo.name}
            </SimpleCell>
          ) : null}

          {viewStats !== null ? (
            <div className="feed-card__views">
              <Icon16View />
              <span>{viewStats.views_total.toLocaleString('ru-RU')}</span>
            </div>
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

          {commentsState.isLoading ? <div className="feed-card__comments-state">Загружаю комментарии…</div> : null}
          {!commentsState.isLoading && commentsState.error ? <div className="feed-card__comments-state">{commentsState.error}</div> : null}
          {!commentsState.isLoading && !commentsState.error && commentsState.items.length === 0 ? (
            <div className="feed-card__comments-state">Пока комментариев нет.</div>
          ) : null}

          {!commentsState.isLoading && !commentsState.error && commentsState.items.length > 0 ? (
            <div className="feed-card__comments-list">
              {commentsState.items.map((comment) => {
                const commentAuthor = [comment.user.first_name, comment.user.last_name].filter(Boolean).join(' ');
                const isLikeActionPending = commentActionId === String(comment.id);

                return (
                  <div key={comment.id} className="feed-card__comment">
                    <div className="feed-card__comment-header">
                      <div className="feed-card__comment-name">{commentAuthor || `VK ${comment.user.vk_user_id}`}</div>
                      <div className="feed-card__comment-meta">{formatPostDate(comment.created_at)}</div>
                    </div>
                    <div className="feed-card__comment-body">{comment.body}</div>
                    <div className="feed-card__comment-actions">
                      <IconButton
                        aria-label="Лайк"
                        disabled={!commentsAuth.token || isLikeActionPending}
                        onClick={() => handleToggleLike(comment)}
                      >
                        {comment.is_liked_by_me ? <Icon20LikeCircleFillRed /> : <Icon16LikeOutline />}
                      </IconButton>
                      <span className="feed-card__comment-likes">{comment.likes_count}</span>
                    </div>
                  </div>
                );
              })}
              {commentsState.total > commentsState.items.length ? (
                <button type="button" className="feed-card__comments-more" onClick={() => setCommentsLimit((currentLimit) => currentLimit + 5)}>
                  Показать ещё 5
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        </Div>
      </Card>
    </div>
  );
};

FeedPostCard.propTypes = {
  commentsAuth: PropTypes.shape({
    token: PropTypes.string.isRequired,
  }).isRequired,
  onOpenPost: PropTypes.func.isRequired,
  post: PropTypes.object.isRequired,
  registerVideo: PropTypes.func.isRequired,
};