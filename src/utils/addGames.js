import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const games = [
  {
    title: "BINDAS WIN",
    description: "Get predictions for BINDAS WIN hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://bindaskhelo.online/login.php",
    isPinned: true,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Parimatch",
    description: "Get predictions for Parimatch hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://pariimatch.online/",
    isPinned: true,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "1win",
    description: "Get predictions for 1win hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://1winonline.in/",
    isPinned: true,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "1xbet",
    description: "Get predictions for 1xbet hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://ind.1x-bet.mobi/registration",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Most Bet",
    description: "Get predictions for Most Bet hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://mstbt.io/I0d5E",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Daman",
    description: "Get predictions for Daman hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://damansuperstar.com/#/register?invitationCode=1245814378837",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "91 Club",
    description: "Get predictions for 91 Club hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://91club-game.net/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Diu Win",
    description: "Get predictions for Diu Win hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://www.diuwin4.com/#/register?invitationCode=2715211255796",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Tiranga",
    description: "Get predictions for Tiranga hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://tirangagame.top/#/register?invitationCode=271262807918",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Playinmatch",
    description: "Get predictions for Playinmatch hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://playinmatch.com?ref=36820954Xaw",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Bdg Win",
    description: "Get predictions for Bdg Win hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://bdg588.com//#/register?invitationCode=5464311692237",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Goa Game",
    description: "Get predictions for Goa Game hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "http://www.goaok.live/#/register?invitationCode=284135980967",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "P77",
    description: "Get predictions for P77 hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://p77.game/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "4rabet",
    description: "Get predictions for 4rabet hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://4rabet-play.com/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Yono 777",
    description: "Get predictions for Yono 777 hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://yono777.online/?code=F9MEK66P6UD&t=1727592235",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Yolo247",
    description: "Get predictions for Yolo247 hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://m.yolo247.site/signup/K9GwP8mdv",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "KHALO24BET",
    description: "Get predictions for KHALO24BET hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://khelo24bet365.com/live-casino?q=tvbet",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Okwin",
    description: "Get predictions for Okwin hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://okwinslots5.com/#/register?invitationCode=775715646031",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Reddy Book Club",
    description: "Get predictions for Reddy Book Club hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://reddybook.club/signup?referral_code=SETz4b",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Big Mumbai",
    description: "Get predictions for Big Mumbai hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://www.mumbai-big.com/#/register?invitationCode=425556252594",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "55 Ace",
    description: "Get predictions for 55 Ace hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://ind.55ace.com/home",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "82 Lottery",
    description: "Get predictions for 82 Lottery hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://82lottery.org.in/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "66 Lottery",
    description: "Get predictions for 66 Lottery hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://www.66lottery20.com/#/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Battery",
    description: "Get predictions for Battery hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://batery-bets.in/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "9kboss",
    description: "Get predictions for 9kboss hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://www.9kboss.com/freeSpin",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Raja Luck",
    description: "Get predictions for Raja Luck hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://rajaluckk.app/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Ultra Win",
    description: "Get predictions for Ultra Win hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://www.ultrawin.co.in/home",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Bharat Club",
    description: "Get predictions for Bharat Club hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://bharatclub.life/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Ind Win7",
    description: "Get predictions for Ind Win7 hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://indwin7.com.in/login",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "55 Club",
    description: "Get predictions for 55 Club hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://www.55club08.com/#/register?invitationCode=588547414963",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Bunty Game",
    description: "Get predictions for Bunty Game hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://bountygame17.com/#/login",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Stake",
    description: "Get predictions for Stake hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://stake.com/?gad_source=1",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Cricaza",
    description: "Get predictions for Cricaza hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://cricaza247.com/mobile",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Fair Play",
    description: "Get predictions for Fair Play hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://fairplay1.club/exchange_sports/inplay",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Jalwa",
    description: "Get predictions for Jalwa hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://jalwa.win/#//#/register?invitationCode=238834089672",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Big Daddy",
    description: "Get predictions for Big Daddy hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://bigdaddygame.com.in/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Win Match",
    description: "Get predictions for Win Match hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://winmatch365.com/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Ztl Games",
    description: "Get predictions for Ztl Games hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://ztlgame.in/?sharecode=a4765982",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Tc Lottery",
    description: "Get predictions for Tc Lottery hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://tcvvip.in/",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Playinexch",
    description: "Get predictions for Playinexch hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://playinexch247.com/mobile/in-play",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Dmwin",
    description: "Get predictions for Dmwin hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://www.dmwin5.com/#/register?invitationCode=216772641286",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "51 Game",
    description: "Get predictions for 51 Game hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://51game.app/#/register?invitationCode=573574385448",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "101 Game",
    description: "Get predictions for 101 Game hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://1012game.in/#/register?invitationCode=381734068754",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "In999",
    description: "Get predictions for In999 hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://www.in999.club/#/register?invitationCode=576835370828",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  },
  {
    title: "Sikkim",
    description: "Get predictions for Sikkim hack",
    imageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop",
    gameLink: "https://www.sikkim2.com/#/login",
    isPinned: false,
    createdAt: new Date(),
    adminPredictions: []
  }
];

export const addAllGames = async () => {
  try {
    console.log('Starting to add games...');
    for (const game of games) {
      await addDoc(collection(db, 'games'), game);
      console.log(`Added game: ${game.title}`);
    }
    console.log('All games added successfully!');
  } catch (error) {
    console.error('Error adding games:', error);
  }
}; 