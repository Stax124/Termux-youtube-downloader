import chalk from "chalk";
import { exec } from "child_process";
import commandExists from "command-exists";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { exit } from "process";
import prompts from "prompts";

enum OutputFolders {
	Music = "~/storage/shared/Music",
	Videos = "~/storage/shared/Videos",
	CurrentDir = ".",
}

interface Config {
	format: string;
	output_folder: OutputFolders;
	sponsorblock_enabled: boolean;
	move_files: boolean;
	enable_playlists: boolean;
}

async function install_dependencies() {
	commandExists("python").catch(async (err) => {
		const answer = await prompts({
			type: "confirm",
			name: "value",
			message: "You need to install python. Do you want to install it?",
		});

		if (answer.value) {
			const child_process = exec("pkg install python");
			child_process.stdout!.on("data", (data) => {
				process.stdout.write(data);
			});

			commandExists("python")
				.then(async (exists) => {
					console.log(chalk.greenBright("Python successfully installed"));
				})
				.catch(async (err) => {
					console.log(chalk.redBright("Python failed to install"));

					const answer = await prompts({
						type: "confirm",
						name: "value",
						message: "Do you want to try again?",
					});

					if (!answer.value) {
						exit(2); // Python failed to install
					} else {
						return main();
					}
				});
		}
	});

	commandExists("yt-dlp").catch(async (err) => {
		const answer = await prompts({
			type: "confirm",
			name: "value",
			message: "You need to install yt-dlp. Do you want to install it?",
		});

		if (answer.value) {
			const child_process = exec("pip install yt-dlp");
			child_process.stdout!.on("data", (data) => {
				process.stdout.write(data);
			});

			commandExists("yt-dlp")
				.then(async (exists) => {
					console.log(chalk.greenBright("yt-dlp successfully installed"));
				})
				.catch(async (err) => {
					console.log(chalk.redBright("yt-dlp failed to install"));

					const answer = await prompts({
						type: "confirm",
						name: "value",
						message: "Do you want to try again?",
					});

					if (!answer.value) {
						exit(2); // Python failed to install
					} else {
						return main();
					}
				});
		}
	});

	console.log(chalk.greenBright("All dependencies installed"));
}

function run_ytdlp(
	url: string,
	format: string,
	output_folder: OutputFolders,
	sponsorblock_enabled: boolean = true,
	move_files: boolean = true,
	enable_playlists: boolean = true
) {
	const move = `--exec 'mv {} ${output_folder}'`;

	const child_process = exec(
		`yt-dlp ${url} ${
			sponsorblock_enabled ? "--sponsorblock-remove all" : ""
		} -f ${format} ${move_files ? move : ""} ${
			enable_playlists ? "--yes-playlist" : ""
		} --output %(title)s.%(ext)s --add-metadata`
	);

	child_process.stdout!.on("data", (data) => {
		process.stdout.write(data);
	});
}

function getUrl() {
	if (process.argv.slice(2).length == 0) {
		console.log(chalk.redBright("No arguments provided"));
		exit(1);
	}
	const url = process.argv.slice(2)[0];
	console.log(chalk.blueBright("URL: " + url));
	return url;
}

async function createconfig() {
	const saveConfig = await prompts({
		type: "confirm",
		name: "value",
		message:
			"Do you want to create a new config file? (answering no will not save it)",
	});

	const format = await prompts({
		type: "select",
		name: "answer",
		message: "What format do you want to download?",
		choices: [
			{ title: "Audio+Video", value: "bestvideo+bestaudio" },
			{ title: "Video only", value: "bestvideo" },
			{ title: "Audio only", value: "bestaudio" },
			{ title: "Other", value: "other" },
		],
	});

	if (format.answer === "other") {
		const other = await prompts({
			type: "text",
			name: "answer",
			message: "What format do you want to download?",
		});
		format.answer = other.answer;
	}

	const output_folder = await prompts({
		type: "select",
		name: "answer",
		message: "Where do you want to save the files?",
		choices: [
			{ title: "Music", value: OutputFolders.Music },
			{ title: "Videos", value: OutputFolders.Videos },
			{ title: "Current directory", value: OutputFolders.CurrentDir },
		],
	});

	const sponsorblock_enabled = await prompts({
		type: "confirm",
		name: "value",
		message: "Do you want to enable sponsorblock-API ?",
	});

	const move_files = await prompts({
		type: "confirm",
		name: "value",
		message: "Do you want to move the files to the output folder?",
	});

	const enable_playlists = await prompts({
		type: "confirm",
		name: "value",
		message: "Do you want to enable downloading playlists?",
	});

	const config: Config = {
		format: format.answer,
		output_folder: output_folder.answer,
		sponsorblock_enabled: sponsorblock_enabled.value,
		move_files: move_files.value,
		enable_playlists: enable_playlists.value,
	};

	// Save config
	if (saveConfig.value) {
		writeFileSync("./config.json", JSON.stringify(config));
	}

	return config;
}

async function main() {
	let config: Config;

	await install_dependencies();
	const url = getUrl();
	if (existsSync("./config.json")) {
		try {
			const useConfig = await prompts({
				type: "confirm",
				name: "value",
				message: "Do you want to use the config file?",
			});
			if (!useConfig.value) {
				throw new Error("User did not want to use config file");
			}

			config = JSON.parse(readFileSync("./config.json", { encoding: "utf8" }));
		} catch (err) {
			console.log(chalk.redBright("Failed to read config file"));

			config = await createconfig();
		}
	} else {
		config = await createconfig();
	}

	run_ytdlp(
		url,
		config.format,
		config.output_folder,
		config.sponsorblock_enabled,
		config.move_files,
		config.enable_playlists
	);
}

main();
