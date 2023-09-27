import React, { Component, useEffect, useState, useContext, useRef } from "react";
import { withRouter } from 'next/router';
import _ from 'lodash';
import socketContext from '../../context/socketContext';
import { FaEdit, FaUser, FaLongArrowAltRight,FaTrashAlt } from 'react-icons/fa';
import { AiOutlineEye, AiOutlineLink, AiOutlineCloseCircle, AiOutlineCheck, AiOutlinePlus } from 'react-icons/ai';
import { VscDebugRestart } from 'react-icons/vsc';
import { BiDoorOpen, BiSad, BiSearchAlt } from 'react-icons/bi';
import { RiCloseCircleFill } from 'react-icons/ri';
import { usePageVisibility } from 'react-page-visibility';
import ReactMarkdown from 'react-markdown';
import Markdown from 'marked-react';
import remarkGfm from 'remark-gfm';
import Switch from "react-switch";
import Cookies from 'js-cookie';
import Creatable from 'react-select/creatable';
import Checkbox from "react-custom-checkbox";
import Lottie from 'react-lottie-player'
import animationData from "../../public/animation/eye.json";
import ReactTooltip from 'react-tooltip';
import { marked } from 'marked';
const Room = (props) => {

  const topics = [
    {
      label: "UX", 
      options: [
        { label: "Do we need a mock for this?" },
        { label: "How will this look in mobile breakpoints?" },
        { label: "Do we have the icons added in Icomoon?" }
      ]
    }, {
      label: "Front-end / Back-end", 
      options: [
        { label: "Will this require both front and back-end?" },
        { label: "Does this apply for PHP/AngularJS pages?" },
        { label: "Will this require a new library?" },
        { label: "Do we have a component for this?" },
        { label: "Do we have class styles for this?" },
        { label: "Do we an example anywhere?" },
        { label: "What API should be used?" },
        { label: "Which system settings may affect this story?" },
        { label: "Should this be implemented on Syng?" }
      ]
    },
    {
      label: "Accessibility",
      options: [
        { label: "How will accessibility behave in this case?" },
        { label: "How should we label elements for screen readers?" }
      ]
    },
    {
      label: "Testing",
      options: [
        { label: "Will this require both QA and UX review?" },
        { label: "Should we re-test any other part of the system?" }
      ]
    },
    {
      label: "Story",
      options: [
        { label: "Is this release when ready?" },
        { label: "Is this for law version only?" },
        { label: "Does this story depend on another?" }
      ]
    }
  ];

  const socket = useContext(socketContext);
  const [userNameInput, setUserNameInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomHost, setRoomHost] = useState('');
  const [userList, setUserList] = useState({});
  const [newUserList, setNewUserList] = useState({});
  const [pointList, setPointList] = useState({});
  const [topicList, setTopicList] = useState([]);
  const [topicSelect, setTopicSelect] = useState(null);
  const [newTopic, setNewTopic] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [removeTopic, setRemoveTopic] = useState(null);
  const [topicDiscussed, setTopicDiscussed] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [recoverVote, setRecoverVote] = useState(null);
  const [revealVotes, setRevealVotes] = useState(false);
  const [unrevealVotes, setUnrevealVotes] = useState(false);
  const [revealedVotes, setRevealedVotes] = useState(false);
  const [whoVoted, setWhoVoted] = useState(null)
  const [whoVoting, setWhoVoting] = useState(null)
  const [storyLabel, setStoryLabel] = useState('needs grooming');
  const [storyPrevLabel, setStoryPrevLabel] = useState(null);
  const [story, setStory] = useState([]);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyLoaded, setStoryLoaded] = useState(false);
  const [activeStory, setActiveStory] = useState(0);
  const [storyNotFound, setStoryNotFound] = useState(false);
  const [findStoryLabel, setFindStoryLabel] = useState('Load Stories');
  const [findStoryDisabled, setFindStoryDisabled] = useState(false);
  const [storyCooldown, setStoryCooldown] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [flipAnimation, setFlipAnimation] = useState(false);
  const [discussionInput, setDiscussionInput] = useState('');
  const [lottieRef, setLottieRef] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  let isRendered = false;

  const isVisible = usePageVisibility();

  useEffect(() => {    
    isRendered = true;
    ReactTooltip.rebuild();

    (function() {
        function scrollHorizontally(e) {
            e = window.event || e;
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
            sel.scrollLeft -= (delta * 40); // Multiplied by 40
            e.preventDefault();
        }
        let sel = document.getElementById('story-selector');
        if (sel) {
          if (sel.addEventListener) {
              // IE9, Chrome, Safari, Opera
              sel.addEventListener('mousewheel', scrollHorizontally, false);
              // Firefox
              sel.addEventListener('DOMMouseScroll', scrollHorizontally, false);
          }
        }
    })();

    let userCookieName = Cookies.get("user-name");
    if (userCookieName) {
      setUserNameInput(userCookieName); 
    }

    const listen = (message, func) => {
      socket.on(message, (ret) => {
        if (isRendered) { func(ret); }
      })
    }

    listen("room-users", (data) => {
      data = JSON.parse(data);
      setNewUserList(data);
      let user = _.find(data, x => x.id === socket.id);
      if (user) {
        console.log('host');
        console.log(user);
      }
      if (user !== undefined && user.name) {
        setUserName(user.name);
      }
    })

    listen("room-info", (data) => {
      data = JSON.parse(data);
      setRoomHost(data.host);
      if (data.revealVotes) {
        setRevealedVotes(true);
      }
      setTopicList(data.topics);
    })

    listen("reset-votes", (data) => {
      setRevealedVotes(false);
    })

    listen("room-points", (data) => {
      setPointList(JSON.parse(data));
    })

    listen("someone-voted", (data) => {      
      let vote = JSON.parse(data);
      setWhoVoted(vote);
    })

    listen("someone-voting", (data) => {      
      let vote = JSON.parse(data);
      setWhoVoting(vote);
    })

    listen("update-is-voting", (data) => {  
      socket.emit('is-voting', isVisible);
    })

    listen("reveal-votes", (data) => {     
      setFlipAnimation(true); 
      setTimeout(() => setFlipAnimation(false), 1000)
      setRevealVotes(true);
      setRevealedVotes(true);
    })

    listen("unreveal-votes", (data) => {
      setRevealedVotes(false);
      setUnrevealVotes(true);
    })

    listen("update-votes", (data) => {      
      setRevealVotes(true);
    })

    listen("recover-vote", (data) => {
      setRecoverVote(data);
    })

    listen("rejoin", (data) => {
      socket.emit("joined-room");
    })

    listen("goto-room", (roomName) => {
      props.router.push('/' + roomName);
    })

    listen("goto-index", (data) => {      
      props.router.push('/');
    })

    listen("story-loading", (data) => { 
      setStoryLoading(data);     
    })

    listen("refresh", (data) => { 
      setRefresh(true);     
    })

    listen("topic-discussed", (topic) => { 
      setTopicDiscussed(topic);
    })

    listen("story-loaded", (story) => {
      if (!_.isEmpty(story)) {
        setStoryNotFound(false);
        setStory(story);

        setStoryLoading(false);
        if (!story.no_cooldown) {
          setStoryCooldown(true);
        }
        let storyDiv = document.querySelector('.story');
        storyDiv.style.minHeight = storyDiv.getBoundingClientRect().height + 'px';
      }
    })

    listen("story-404", () => {
      setStoryNotFound(true);
      setStoryLoading(false);
      setStoryCooldown(true);
    })

    listen("add-topic", (data) => {
      setNewTopic(data);
    })

    listen("remove-topic", (data) => {
      setRemoveTopic(data);
    })

    listen("clear-topics", (data) => {
      setTopicList([]);
    })

    listen("change-story", (data) => {
      setActiveStory(data);
    })

    listen("check-room-exists", () => {
      socket.emit('check-room-exists', JSON.stringify({ roomName: null, token: Cookies.get("user-token") }));
    })

    listen("remove-yourself", () => {
      setUserName('');
    })

    return () => {
      isRendered = false;
    };
  }, [])

  useEffect(() => {
    const room = props.router.query.room;
    if (room) {
      socket.emit('check-room-exists', JSON.stringify({ roomName: room, token: Cookies.get("user-token") }));
    }
  }, [props.router.query])

  useEffect(() => {
      if (newTopic) {
        let addingTopic = _.cloneDeep(topicList);
        addingTopic.push(newTopic);
        setTopicList(addingTopic);
        setSelectedTopic(null);
        topicSelect.clearValue();
      }
  }, [newTopic])

  useEffect(() => {
      if (removeTopic) {
        let removingTopic = _.cloneDeep(topicList);
        removingTopic = _.filter(topicList, x => x.index != removeTopic);
        setTopicList(removingTopic);
      }
  }, [removeTopic])

  useEffect(() => {
    ReactTooltip.rebuild();
    ReactTooltip.hide();
  }, [topicList])

  useEffect(() => {
    if (topicDiscussed) {
      let tlist = _.cloneDeep(topicList);
      let t = _.find(tlist, x => x.index == topicDiscussed.index);
      if (t) {
        t.checked = topicDiscussed.checked;
        setTopicList(tlist);
      }
      ReactTooltip.rebuild();
    }
  }, [topicDiscussed])

  useEffect(() => {
    setUserList(newUserList);
    /*
    let change = false;
    console.log(userList);
    console.log(newUserList);
    _.each(newUserList, (ul) => {
      let usr = _.find(userList, x => x.id === ul.id);
      if (usr) {
        if (usr.data.point != ul.data.point) {
          change = true;
        }
      }

      if (usr == undefined) {
        change = true;
      }
    })

    console.log(change);
    
    if (change) {
      setUserList(newUserList);
    }
    */
  }, [newUserList])  

  useEffect(() => {
    if (whoVoted) {
      let userListPointed = _.cloneDeep(userList);
      let changed = false;
      let u = _.find(userListPointed, x => x.id === whoVoted.id);
      if (u) {
        if (u.data.point != whoVoted.vote) {
          u.data.point = whoVoted.vote;
          changed = true;
        }
      }

      if (changed) {
        setUserList(userListPointed);
      }
    }
  }, [whoVoted])

  useEffect(() => {
    if (whoVoting) {
      let userListPointed = _.cloneDeep(userList);
      let u = _.find(userListPointed, x => x.id === whoVoting.id);
      if (u) {
        u.data.voting = whoVoting.status;
      }
      setUserList(userListPointed);
      ReactTooltip.rebuild();
    }
  }, [whoVoting])

  useEffect(() => {
    if (Object.keys(userList).length == 0) {
      if (!storyLoaded) {
        setStoryLoaded(true);
      }
    }

    ReactTooltip.rebuild();
    ReactTooltip.hide();
  }, [userList])

  useEffect(() => {
    if (revealVotes) {
      //vote(myVote);
      setRevealVotes(false);
    }
  }, [revealVotes])

  useEffect(() => {
    if (storyLoaded) {
      getStory(null);
    }
  }, [setStoryLoaded])

  useEffect(() => {
    socket.emit('is-voting', isVisible);
    ReactTooltip.rebuild();
  }, [isVisible])

  useEffect(() => {
    
    ReactTooltip.rebuild();

    let s = _.findIndex(story, (x, index) => x.active == true);
    if (s !== -1) {
      setActiveStory(s);
    }
    if (story.length > 0) {
      setStoryPrevLabel(story[0].storyLabel);
    }
  }, [story])

  useEffect(() => {
    let index = activeStory;
    var pager = document.getElementById('story-selector-wrapper');
    var _a, _b;
    if (pager && pager.querySelectorAll('button').length > 0) {
      var previous_1 = 0;
      pager.querySelectorAll('button').forEach(function (q) {
        q.classList.remove('is-selected', 'is-next', 'is-prev');
      });
      var margin_1 = 1;
      var total = pager === null || pager === void 0 ? void 0 : pager.querySelectorAll('button').length;
      var prev = pager === null || pager === void 0 ? void 0 : pager.querySelectorAll('button')[index - 1];
      var next = pager === null || pager === void 0 ? void 0 : pager.querySelectorAll('button')[index + 1];
      var actual = pager === null || pager === void 0 ? void 0 : pager.querySelectorAll('button')[index];
      var sLeft = (_a = pager === null || pager === void 0 ? void 0 : pager.parentElement) === null || _a === void 0 ? void 0 : _a.scrollLeft;
      var viewableWidth = pager === null || pager === void 0 ? void 0 : pager.parentElement.clientWidth;
      if (actual) {
          var indexLeft = ((actual === null || actual === void 0 ? void 0 : actual.getBoundingClientRect().left) - (pager === null || pager === void 0 ? void 0 : pager.getBoundingClientRect().left) - margin_1) - sLeft;
          var totalWidth_1 = 0;
          pager === null || pager === void 0 ? void 0 : pager.querySelectorAll('button').forEach(function (e) {
              totalWidth_1 += e.clientWidth + (2 * margin_1);
          });
          previous_1 = index;
          if (!next) {
              next = pager === null || pager === void 0 ? void 0 : pager.querySelectorAll('button')[0];
          }
          if (!prev) {
              prev = pager === null || pager === void 0 ? void 0 : pager.querySelectorAll('button')[total - 1];
          }
          var positionInsideView = (sLeft + indexLeft) - ((viewableWidth / 2) - (((actual === null || actual === void 0 ? void 0 : actual.clientWidth) + (2 * margin_1)) / 2));
          
          if (positionInsideView < 0 || positionInsideView > 1) {
              (_b = pager === null || pager === void 0 ? void 0 : pager.parentElement) === null || _b === void 0 ? void 0 : _b.scroll({
                  left: (((actual === null || actual === void 0 ? void 0 : actual.getBoundingClientRect().left) - (pager === null || pager === void 0 ? void 0 : pager.getBoundingClientRect().left)) - (viewableWidth / 2) + (((actual === null || actual === void 0 ? void 0 : actual.clientWidth) / 2) - margin_1)),
                  top: 0,
                  behavior: 'smooth'
              });;
          }
          if (prev) {
              prev.classList.add('is-prev');
          }
          if (next) {
              next.classList.add('is-next');
          }
          actual.classList.add('is-selected');
      }
  }
  }, [activeStory])

  useEffect(() => {
    if (unrevealVotes) {
      socket.emit("voted", myVote);
      setUnrevealVotes(false);
    }
  }, [unrevealVotes])

  useEffect(() => {
    vote(recoverVote);
  }, [recoverVote])

  useEffect(() => {
    if (refresh) {
      setRefresh(false);
      window.location.reload();
    }
  }, [refresh])

  useEffect(() => {
    if (storyCooldown) {
      setStoryCooldown(false);
      setFindStoryDisabled(true);
      let timeout = 6;
      let timer = setInterval(() => {
        timeout -= 1;
        setFindStoryLabel('Load Story' + ' (' + timeout + ')')
        if (timeout == 0) {
          clearInterval(timer);
          setFindStoryDisabled(false);
          setFindStoryLabel('Load Story')
        }
      }, 1000)
    }
  }, [storyCooldown])


  const linkify = (inputText) => {
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '[$1]($1)');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '[$1]($2)');

    return replacedText;
  }

  const vote = (val) => {
    if (val !== null) {
      let userListPointed = _.cloneDeep(userList);
      let userListP = _.find(userListPointed, x => x.id === socket.id);
      if (userListP && userListP.data !== undefined) {
        userListP.data.point = val;        
      }
      setMyVote(val);
      setUserList(userListPointed);

    }
    socket.emit("voted", val);
  }

  const revealVotesAction = () => {
    if (!revealedVotes) {
      socket.emit("reveal-votes");
    } else {
      socket.emit("unreveal-votes");
    }
  }
  const resetVotesAction = () => {
    socket.emit("reset-votes");
  }
  const leaveRoomAction = () => {
    setTopicList([]);
    socket.emit("leave-room");
  }
  const getStory = (e) => {
    if (e) { e.preventDefault(); }
    setStoryLoading(true);
    setStoryNotFound(false);
    socket.emit("get-story", storyLabel);
  }
  const start = (e) => {
    e.preventDefault();
    setEditingName(false);
    socket.emit("user-name", userNameInput);
    Cookies.set('user-name', userNameInput);
    socket.emit("is-voting", true);
  }
  const delUser = (e) => {
    e.preventDefault();
    socket.emit("deluser");
  }
  const mostVoted = () => {
    let mostV = [];
    let totalV = totalVotes();

    Object.values(pointList).map((val: any) => {
      mostV.push({
        label: val,
        point: 0
      });
    });

    Object.values(userList).map((user: any) => {
      if (user.data.point != undefined) {
        let findLabel = _.find(mostV, x => x.label == user.data.point);
        if (findLabel) {
          findLabel.point++;
        }
      }
    })

    Object.values(mostV).map((most: any) => {
      most.width = most.point * (100 / totalV);
      most.scale = most.point * (1.5 / totalV);
    })
    return mostV; 
  }

  const totalVotes = () => {
    let votes = 0;
    Object.values(userList).map((user: any) => {
      if (user.data.point != undefined && user.data.point != 'Not voted' && user.data.point != 'Voted') {
        votes++;
      }
    })
    return votes;
  }

  const addTopic = () => {
    if (selectedTopic) {
      socket.emit('add-topic', selectedTopic.value);
    }
  }

  const removeTopicAction = (index) => {
    if (window.confirm('Are you sure you want to remove this topic?')) {
      socket.emit('remove-topic', index);
    }
  }

  const topicValues = () => {
    _.each(topics, topic => {
      _.each(topic.options, x => {
        x.value = x.label
      })
    })
    return topics;
  }

  const clearTopics = () => {
    if (window.confirm('Are you sure you want to remove all topics?')) {
      socket.emit('clear-topics');
    }
  }

  const topicDiscussedAction = (index, val) => {
    socket.emit('topic-discussed', { index: index, checked: val });
  }

  const solvedTopics = () => {
    let solved = _.filter(topicList, x => x.checked).length;
    return solved;
  }

  const removeUser = () => {
    if (confirm('Remove your participation?')) {
      socket.emit('remove-user-from-list');
      setUserName('');
    }
  }

  const removeGivenUser = (user) => {
    if (confirm('Are you sure you want to remove ' + user.name + '?')) {
      socket.emit('remove-given-user-from-list', user.id);
    }
  }

  const goTo = (e, number) => {
    e.preventDefault();
    socket.emit('goto-story', number);
  }

  const goToSection = (e, index) => {
    let storyArea = document.querySelector('.story-area');
    let discussionArea = document.querySelector('.discussion');
    setActiveSection(index);

    if (index === 0) {
      storyArea.style.display = 'block';
      discussionArea.style.display = 'none';
    }
    if (index === 1) {
      storyArea.style.display = 'none';
      discussionArea.style.display = 'flex';
    }
  }

  return (
    <>
    <title>Dundies Symple Points</title>
    <main>
      <div className="card-logo enlarge">
        <span><i>D</i></span>
        <span>u</span>
        <span>n</span>
        <span>d</span>
        <span>i</span>
        <span>e</span>
        <span>s</span>
        <div className="symple">symple points</div>
      </div>
      <div className="top">
        <div className="top-left">

          {(userName === '' || editingName) && (
          <div className="joined-as">
            <>
              { !editingName &&
              <div className="blurb">To join this pointing session, please enter your name:</div>}
              { editingName &&
              <div className="blurb">What's your new name?</div>}
              <div className="field">
                <form className="flex" onSubmit={(e) => start(e)}>
                  <input type="text" className="regular-input mr-10" placeholder="Name" required onChange={(e) => setUserNameInput(e.target.value)} value={userNameInput} /> 
                  <button disabled={userNameInput.length < 1} className="action">Start</button>
                </form> 
              </div> 
            </>
          </div>
          )}

          {userName !== '' && !editingName && (
            <>
                <h2 className="username">
                <a className="icon" data-tip="Change your name" onClick={() => { setEditingName(true); }}><FaEdit /></a>
                <a className="icon trash" data-tip="Remove you from the pointing list" onClick={() => { removeUser(); }}><FaTrashAlt /></a>
                {userName}</h2>
            </>
          )}

        </div>

        <div className="top-right">
          <div className="top-action">
            <button title="Leave room" data-tip="Leave room" onClick={() => { leaveRoomAction() }} className="action icon-button"><BiDoorOpen /></button> 
          </div>
          <div className="top-info">
            {Object.values(userList).filter((x: any) => x.name == undefined).length >= 0 &&
            <div className="observers">
              <div className="info"><span>{Object.values(userList).filter((x: any) => x.name == undefined).length}</span> Observing</div>
              <div className="info"><span>{Object.values(userList).filter((x: any) => x.name != undefined).length}</span> Participating</div>
            </div>}
          </div>
        </div>
      </div>

      <div className="booklet">
        <ul className="display-tabs">
          <li className={`${activeSection === 0 ? 'active' : ''}`}><button onClick={(e) => { goToSection(e, 0) }}>Stories</button></li>
          <li className={`${activeSection === 1 ? 'active' : ''}`}><button onClick={(e) => { goToSection(e, 1) }}>Discussion ({ topicList.length })</button></li>
        </ul>
      <div className="booklet-page">
      <div className="booklet-page">
      <div className="booklet-page">
      <div className="booklet-page">

        <div className="flex">
          <div className="point">
            {userName != '' &&
              <ul className="point-options">
              {Object.values(pointList).map((val: any) => {
                return <li key={val}><button className="shadow" onClick={() => { vote(val) }}>{val}</button></li>
              })}
              </ul>
            }

            {Object.values(userList).find((x: any) => x.name != undefined) == undefined &&
              <div className="notice">
                <h2>Story pointing</h2>
                Pointing starts when someone joins.
              </div>
            }

            {Object.values(userList).find((x: any) => x.name != undefined) != undefined &&
              <ul className="name-list">
              {Object.values(userList).map((val: any) => {
                return val.name && (<li key={val.id}>
                  <div className="name">
                    {roomHost === socket.id && <a data-tip="As host you can remove this user from the pointing list" onClick={() => { removeGivenUser(val); }}>{val.name}</a>}
                    {roomHost !== socket.id && <>{val.name}</>}
                  </div>

                  <div className="card-placeholder">

                    {(socket.id == val.id) && val.data.point != 'Not voted' && val.data.point != 'Voted' &&
                      <div className={`vote-card flipped`} >
                      <div className="inner">
                          <div className="front shadow">{val.data.point}</div>
                          <div className="back card-logo"><span><i>D</i></span></div>
                        </div>
                      </div>
                    }

                    {(socket.id != val.id) && val.data.point != 'Not voted' && val.data.point != 'Voted' &&
                    <div className={`vote-card ${flipAnimation ? "unflip" : "flipped"}`} >
                      <div className="inner">
                        <div className="front shadow">{val.data.point}</div>
                        <div className="back card-logo"><span><i>D</i></span></div>
                      </div>
                    </div>
                    }

                    {val.data.point == 'Voted' &&
                    <div className="vote-card">
                      <div className="inner">
                        <div className="front shadow">{val.data.point}</div>
                        <div className="back card-logo"><span><i>D</i></span></div>
                      </div>
                    </div>
                    }

                    {val.data.point == 'Not voted' &&
                    <div className="vote-card">
                      <div className="inner bg-white">
                        <div className="back shadow">
                        {val.data.voting &&
                          <div className="eye-icon">
                            <Lottie
                              data-tip data-for={val.name + '-eyeOpen'}
                              animationData={animationData}
                              play
                              loop={false}
                              speed={3}
                            />
                          </div>
                        }

                        {!val.data.voting &&
                          <div className="eye-icon">
                            <Lottie
                              data-tip data-for={val.name + '-eyeClosed'} 
                              animationData={animationData}
                              play
                              loop={false}
                              direction={-1}
                              speed={3}
                            />
                          </div>
                        }
                        </div>
                      </div>
                    </div>
                    }
                    <ReactTooltip id={val.name + '-eyeOpen'}>
                      {val.name} is looking at the screen
                    </ReactTooltip>
                    <ReactTooltip id={val.name + '-eyeClosed'}>
                      {val.name} is NOT looking at the screen
                    </ReactTooltip>

                  </div>
                </li>)
              })}
              </ul>
            }

            {!(Object.values(userList).find((x: any) => x.name != undefined) == undefined) &&
              <div className="pointing-actions">
                <button className="action danger fleft" onClick={() => { resetVotesAction() }}><VscDebugRestart />Reset</button> 
                <div className="action secondary fright switchToggle" onClick={() => { revealVotesAction() }}>
                  <label><Switch width={35} checkedIcon={false} uncheckedIcon={false} handleDiameter={20} height={20} className="toggle" onChange={revealVotesAction} checked={revealedVotes} />
                  Reveal votes</label>
                </div> 
              </div>
            }
            {revealedVotes && totalVotes() > 0 &&
              <div className="most-voted fadeInSlow">
                <h3 className="mb-0">Most Voted: </h3>
                <ul>
                  {mostVoted().map((val: any) => {
                    return val.point > 0 && <li key={val.label} style={{ width: val.width + '%' }}>
                      <div className="card shadow" style={{ transform: 'scale('+ val.scale + ')' }}>{val.label}</div>
                    </li>
                  })}
              </ul>
              </div>
            }
          </div>

          <div className="story">
            <div className="display-area">
              <div className="story-area">
                <form className="flex" onSubmit={(e) => getStory(e)}>
                  <input className="regular-input mr-10" type="text" placeholder="Label" required onChange={(e) => setStoryLabel(e.target.value)} value={storyLabel} />
                  <button className="action nowrap load-story" disabled={findStoryDisabled || storyLoading}>Load Stories</button>
                </form>

                {storyNotFound && <div className="story-status"><BiSad /> There are no stories for this label.</div>}
                {storyLoading && <div className="story-status"><BiSearchAlt /> Loading stories, please wait...</div>}

                {story.length > 0 && 
                  <div className="story-index">{ storyPrevLabel ? '"'+ storyPrevLabel +'" - ' : ''}Story {activeStory + 1} of {story.length}</div>
                }
                
                <div className={`story-selector ${story.length == 0 ? "disabled" : ""}`}  id="story-selector">
                  <div className="story-selector-wrapper" id="story-selector-wrapper">
                  {story.map((val: any, index: number) => {
                    let active = index == activeStory ? 'active' : '';
                    return <button key={ index } data-tip={ val.name } className={`${active ? "active" : ""}`} onClick={(e) => { goTo(e, index) }}>{index + 1}</button> 
                  })}
                  </div>
                </div>
                {story.length > 0 && 
                <div className="story-slider">
                    {story.map((val: any) => {
                      return val.id &&
                      <div  key={ val.id } className="story-slide" style={{ transform: 'translateX(' + (activeStory * -100) + '%)' }}>
                        <a data-tip="Click to open in Pivotal Tracker" className="title" href={val.url} target="_blank"><AiOutlineLink /> {val.name}</a>
                        <div className="description tracker-markup" dangerouslySetInnerHTML={{__html: val.description}}></div>
                      </div>
                    })}
                </div>
                }
                {story.length == 0 && 
                <div className="notice">
                  <h2>Add a story</h2>
                  Adding a story will make it available for everyone to read. 
                  <br /><br />
                  <div><strong>Tip:</strong> Clicking the story's name will open it in Pivotal Tracker.</div>
                </div>
                }
              </div>
              <div className="discussion">
                <div className="flex add-topic">
                  <Creatable
                    options={topicValues()} 
                    ref={(ref) => {
                      setTopicSelect(ref);
                    }}
                    onChange={(e) => setSelectedTopic(e)}
                    placeholder="Select or write a topic"
                    formatCreateLabel={(e) => { return e; }}
                    menuPosition="fixed"
                    menuPlacement="auto"
                    menuShouldBlockScroll={true}
                    className="mr-10"
                  />
                  <button data-tip="Add selected topic" onClick={(e) => { addTopic() }} className="action icon-only"><AiOutlinePlus size={20} /></button>
                </div>

                {topicList.length > 0 && 
                <div className="topics">
                  <ul>

                    {topicList.map((val: any) => {
                      return val.text && 
                      <li onKeyUp={(e) => { e.keyCode == 13 ? topicDiscussedAction(val.index, !val.checked) : null }} key={val.index} tabIndex={0} className={`${val.checked ? "discussed" : ""} ${val.user ? "mb-25" : ""}`}>
                        <label>
                          <div className="topic-discussed" data-tip="Toggle discussed">
                            <Checkbox
                              icon={<AiOutlineCheck color="#56a359" size={20} />}
                              name="my-input"
                              checked={val.checked}
                              onChange={(value) => {
                                topicDiscussedAction(val.index, value);
                              }}
                              size={20}
                              borderColor="#56a359"
                              style={{ cursor: "pointer" }}
                              labelStyle={{ marginLeft: 5, userSelect: "none" }}
                            />
                          </div>
                          {val.user &&
                          <div className="topic-user">{val.user}</div>}
                          <div className="topic-text">{val.text}</div>
                          {val.user_id == socket.id &&
                          <div className="topic-remove" data-tip="Remove topic">
                            <button onClick={(e) => { removeTopicAction(val.index); }}>
                              <RiCloseCircleFill color="#912929" size={20} />
                            </button>
                          </div>
                          }
                        </label>
                      </li>
                    })}
                  </ul>
                </div>  
                }
                {topicList.length == 0 && 
                <div className="notice">

                  <h2>Add a topic</h2>
                  You can add topics here to discuss with the team. Either choose one from the list or type anything, then click Plus Button to add. 
                  <br /><br />
                  <div><strong>Tip:</strong> The topic list can give you good ideas on questions you can make about the story. Feel free to suggest topics to be permanently added to the list.</div>                
                </div>
                }

                {topicList.length > 0 && 
                <div className="discussion-actions">
                  <button className="action clear-topics danger fleft" onClick={() => { clearTopics() }}><VscDebugRestart />Clear topics</button> 
                  <div className="topic-count">{ solvedTopics() + ' / ' + topicList.length }</div>
                </div>}
              </div>
            </div>
          </div>
        </div>


      </div>
      </div>
      </div>
      </div>
      </div>
    </main>
    <ReactTooltip place='top' />
    </>
  );
}

export default withRouter(Room);