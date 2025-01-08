import * as React from 'react';
import { DIRECTION, isTreeScrollable } from '../isScrollable';

export interface PullToRefreshProps {
  // Pull down props
  pullDownContent: JSX.Element;
  releaseContent: JSX.Element;
  refreshContent: JSX.Element;
  pullDownThreshold: number;
  onRefresh: () => Promise<any>;

  // Pull up props
  pullUpContent?: JSX.Element;
  pullUpReleaseContent?: JSX.Element;
  pullUpRefreshContent?: JSX.Element;
  pullUpThreshold?: number;
  onPullUp?: () => Promise<any>;

  // Common props
  triggerHeight?: number | 'auto';
  backgroundColor?: string;
  containerStyle?: React.CSSProperties;
  startInvisible?: boolean;
  children?: React.ReactNode;
}

export interface PullToRefreshState {
  pullToRefreshThresholdBreached: boolean;
  pullUpThresholdBreached: boolean;
  maxPullDownDistance: number;
  maxPullUpDistance: number;
  onRefreshing: boolean;
  onPullUpRefreshing: boolean;
}

export class PullToRefresh extends React.Component<
  PullToRefreshProps,
  PullToRefreshState
> {
  private container: any;
  private pullDown: any;
  private pullUp: any;

  private dragging = false;
  private startY = 0;
  private currentY = 0;
  private scrollTop = 0;
  private scrollHeight = 0;
  private clientHeight = 0;

  constructor(props: Readonly<PullToRefreshProps>) {
    super(props);
    this.state = {
      pullToRefreshThresholdBreached: false,
      pullUpThresholdBreached: false,
      maxPullDownDistance: 0,
      maxPullUpDistance: 0,
      onRefreshing: false,
      onPullUpRefreshing: false,
    };

    this.containerRef = this.containerRef.bind(this);
    this.pullDownRef = this.pullDownRef.bind(this);
    this.pullUpRef = this.pullUpRef.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onEnd = this.onEnd.bind(this);
  }

  private containerRef(container) {
    this.container = container;
  }

  private pullDownRef(pullDown) {
    this.pullDown = pullDown;
    const maxPullDownDistance =
      this.pullDown &&
      this.pullDown.firstChild &&
      this.pullDown.firstChild['getBoundingClientRect']
        ? this.pullDown.firstChild['getBoundingClientRect']().height
        : 0;
    this.setState({ maxPullDownDistance });
  }

  private pullUpRef(pullUp) {
    this.pullUp = pullUp;
    const maxPullUpDistance =
      this.pullUp &&
      this.pullUp.firstChild &&
      this.pullUp.firstChild['getBoundingClientRect']
        ? this.pullUp.firstChild['getBoundingClientRect']().height
        : 0;
    this.setState({ maxPullUpDistance });
  }

  public componentDidMount(): void {
    if (!this.container) {
      return;
    }

    this.container.addEventListener('touchstart', this.onTouchStart);
    this.container.addEventListener('touchmove', this.onTouchMove);
    this.container.addEventListener('touchend', this.onEnd);
    this.container.addEventListener('mousedown', this.onTouchStart);
    this.container.addEventListener('mousemove', this.onTouchMove);
    this.container.addEventListener('mouseup', this.onEnd);
  }

  public componentWillUnmount(): void {
    if (!this.container) {
      return;
    }

    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    this.container.removeEventListener('touchend', this.onEnd);
    this.container.removeEventListener('mousedown', this.onTouchStart);
    this.container.removeEventListener('mousemove', this.onTouchMove);
    this.container.removeEventListener('mouseup', this.onEnd);
  }

  private onTouchStart(e) {
    const { triggerHeight = 1000 } = this.props;
    this.startY = e['pageY'] || e.touches[0].pageY;
    this.currentY = this.startY;

    if (this.container) {
      this.scrollTop = this.container.scrollTop;
      this.scrollHeight = this.container.scrollHeight;
      this.clientHeight = this.container.clientHeight;
    }

    if (triggerHeight === 'auto') {
      const target = e.target;
      const container = this.container;

      if (!container) {
        return;
      }

      if (e.type === 'touchstart' && isTreeScrollable(target, DIRECTION.up)) {
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.top < 0 && rect.bottom > window.innerHeight) {
        return;
      }
    } else {
      const top = this.container.getBoundingClientRect().top || 0;
      if (this.startY - top > triggerHeight) {
        return;
      }
    }

    this.dragging = true;
    this.container.style.transition = 'transform 0.2s cubic-bezier(0,0,0.31,1)';
    if (this.pullDown) {
      this.pullDown.style.transition =
        'transform 0.2s cubic-bezier(0,0,0.31,1)';
    }
    if (this.pullUp) {
      this.pullUp.style.transition = 'transform 0.2s cubic-bezier(0,0,0.31,1)';
    }
  }

  private onTouchMove(e) {
    if (!this.dragging) return;

    this.currentY = e['pageY'] || e.touches[0].pageY;
    const deltaY = this.currentY - this.startY;

    if (e.cancelable) {
      e.preventDefault();
    }

    // Pulling down
    if (deltaY > 0 && this.scrollTop <= 0) {
      if (deltaY >= this.props.pullDownThreshold) {
        this.setState({ pullToRefreshThresholdBreached: true });
      }

      if (deltaY <= this.state.maxPullDownDistance) {
        this.container.style.overflow = 'visible';
        this.container.style.transform = `translate(0px, ${deltaY}px)`;
        if (this.pullDown) {
          this.pullDown.style.visibility = 'visible';
        }
      }
    }

    // Pulling up
    if (
      deltaY < 0 &&
      this.props.onPullUp &&
      this.scrollTop + this.clientHeight >= this.scrollHeight
    ) {
      const pullUpDelta = Math.abs(deltaY);
      const pullUpThreshold =
        this.props.pullUpThreshold || this.props.pullDownThreshold;

      if (pullUpDelta >= pullUpThreshold) {
        this.setState({ pullUpThresholdBreached: true });
      }

      if (pullUpDelta <= this.state.maxPullUpDistance) {
        this.container.style.overflow = 'visible';
        this.container.style.transform = `translate(0px, ${deltaY}px)`;
        if (this.pullUp) {
          this.pullUp.style.visibility = 'visible';
        }
      }
    }
  }

  private onEnd() {
    if (!this.dragging) return;

    this.dragging = false;
    const deltaY = this.currentY - this.startY;
    this.startY = 0;
    this.currentY = 0;

    // Handle pull down refresh
    if (deltaY > 0 && this.state.pullToRefreshThresholdBreached) {
      this.container.style.overflow = 'visible';
      this.container.style.transform = `translate(0px, ${this.props.pullDownThreshold}px)`;
      this.setState({ onRefreshing: true }, () => {
        this.props.onRefresh().then(() => {
          this.initContainer();
          setTimeout(() => {
            this.setState({
              onRefreshing: false,
              pullToRefreshThresholdBreached: false,
            });
          }, 200);
        });
      });
      return;
    }

    // Handle pull up load more
    if (
      deltaY < 0 &&
      this.state.pullUpThresholdBreached &&
      this.props.onPullUp
    ) {
      const pullUpThreshold =
        this.props.pullUpThreshold || this.props.pullDownThreshold;
      this.container.style.overflow = 'visible';
      this.container.style.transform = `translate(0px, -${pullUpThreshold}px)`;
      this.setState({ onPullUpRefreshing: true }, () => {
        this.props.onPullUp().then(() => {
          this.initContainer();
          setTimeout(() => {
            this.setState({
              onPullUpRefreshing: false,
              pullUpThresholdBreached: false,
            });
          }, 200);
        });
      });
      return;
    }

    // Reset if thresholds not breached
    if (this.pullDown) {
      this.pullDown.style.visibility = this.props.startInvisible
        ? 'hidden'
        : 'visible';
    }
    if (this.pullUp) {
      this.pullUp.style.visibility = this.props.startInvisible
        ? 'hidden'
        : 'visible';
    }
    this.initContainer();
  }

  private initContainer() {
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.style.overflow = 'auto';
        this.container.style.transform = 'none';
      }
    });
  }

  private renderPullDownContent() {
    const { releaseContent, pullDownContent, refreshContent, startInvisible } =
      this.props;
    const { onRefreshing, pullToRefreshThresholdBreached } = this.state;

    const content = onRefreshing
      ? refreshContent
      : pullToRefreshThresholdBreached
      ? releaseContent
      : pullDownContent;

    const contentStyle: React.CSSProperties = {
      position: 'absolute',
      overflow: 'hidden',
      left: 0,
      right: 0,
      top: 0,
      visibility: startInvisible ? 'hidden' : 'visible',
    };

    return (
      <div id="ptr-pull-down" style={contentStyle} ref={this.pullDownRef}>
        {content}
      </div>
    );
  }

  private renderPullUpContent() {
    const {
      pullUpContent,
      pullUpReleaseContent,
      pullUpRefreshContent,
      startInvisible,
    } = this.props;
    const { onPullUpRefreshing, pullUpThresholdBreached } = this.state;

    if (!pullUpContent) return null;

    const content = onPullUpRefreshing
      ? pullUpRefreshContent || pullUpContent
      : pullUpThresholdBreached
      ? pullUpReleaseContent || pullUpContent
      : pullUpContent;

    const contentStyle: React.CSSProperties = {
      position: 'absolute',
      overflow: 'hidden',
      left: 0,
      right: 0,
      bottom: 0,
      visibility: startInvisible ? 'hidden' : 'visible',
    };

    return (
      <div id="ptr-pull-up" style={contentStyle} ref={this.pullUpRef}>
        {content}
      </div>
    );
  }

  public render() {
    const { backgroundColor } = this.props;
    const containerStyle: React.CSSProperties = {
      height: 'auto',
      overflow: 'hidden',
      WebkitOverflowScrolling: 'touch',
      position: 'relative',
      zIndex: 1,
    };

    if (this.props.containerStyle) {
      Object.keys(this.props.containerStyle).forEach((key: string) => {
        containerStyle[key] = this.props.containerStyle[key];
      });
    }

    if (backgroundColor) {
      containerStyle.backgroundColor = backgroundColor;
    }

    return (
      <div id="ptr-parent" style={containerStyle}>
        {this.renderPullDownContent()}
        {this.renderPullUpContent()}
        <div id="ptr-container" ref={this.containerRef} style={containerStyle}>
          {this.props.children}
        </div>
      </div>
    );
  }
}
